// Add these helper functions at the top
function isMobile() {
  return window.innerWidth < 768;
}

// Replace sidebar toggle code with this
const wordListToggle = document.getElementById('word-list-toggle');
const wordListPanel = document.getElementById('word-list-panel');

// Toggle panel when clicking the button
wordListToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  wordListPanel.classList.toggle('open');
  if (isMobile()) {
    document.body.style.overflow = wordListPanel.classList.contains('open') ? 'hidden' : '';
  }
});

// Close panel when clicking outside
document.addEventListener('click', (e) => {
  // Only proceed if panel is open
  if (!wordListPanel.classList.contains('open')) return;
  
  // Close if click is outside panel and toggle button
  if (!wordListPanel.contains(e.target) && e.target !== wordListToggle) {
    wordListPanel.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Add escape key to close panel
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && wordListPanel.classList.contains('open')) {
    wordListPanel.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Add resize listener to handle mobile/desktop transitions
window.addEventListener('resize', () => {
  if (!isMobile()) {
    document.body.style.overflow = '';
  }
});

// Array to hold word objects for spaced repetition.
// Each word object will have: { word, interval, nextReview }
let wordsData = [];

// Default interval (in milliseconds) for a new or failed word (1 minute)
const DEFAULT_INTERVAL = 60000;

// Grab DOM elements
const newWordInput = document.getElementById("new-word-input");
const addWordButton = document.getElementById("add-word-button");
const wordListEl = document.getElementById("word-list");
const testContainer = document.getElementById("test-container");

// Load words from localStorage when the page loads
function loadWordsFromStorage() {
  const savedWords = localStorage.getItem('spellingWords');
  if (savedWords) {
    wordsData = JSON.parse(savedWords);
    updateWordListDisplay();
  }
}

// Save words to localStorage
function saveWordsToStorage() {
  localStorage.setItem('spellingWords', JSON.stringify(wordsData));
}

// Update the word list display
function updateWordListDisplay() {
  wordListEl.innerHTML = "";
  wordsData.forEach((wordObj) => {
    const li = document.createElement("li");
    
    // Create word header
    const wordHeader = document.createElement("h3");
    wordHeader.textContent = wordObj.word;
    
    // Create metadata span
    const metadata = document.createElement("span");
    const nextReviewTime = new Date(wordObj.nextReview).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    metadata.textContent = `${Math.round(wordObj.interval / 1000)}s`;
    
    // Add elements to list item
    li.appendChild(wordHeader);
    li.appendChild(metadata);
    wordListEl.appendChild(li);
  });
  saveWordsToStorage();
}

// Update the add word button event listener
addWordButton.addEventListener("click", () => {
  const newWord = newWordInput.value.trim();
  if (newWord === "") return;
  wordsData.push({
    word: newWord,
    interval: DEFAULT_INTERVAL,
    nextReview: Date.now(),
  });
  newWordInput.value = "";
  updateWordListDisplay();
  loadNextWord();
});

// Add reset button functionality
const resetButton = document.getElementById('reset-button');
resetButton.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset the word list? This cannot be undone.')) {
    wordsData = [];
    localStorage.removeItem('spellingWords');
    wordsCompleted = 0;
    totalWordsForSession = 0;
    updateProgress();
    updateWordListDisplay();
    loadNextWord();
  }
});

// Load saved words when the page loads
window.addEventListener("load", () => {
  loadWordsFromStorage();
  loadNextWord();
});

// Load the next word that is due for review
function loadNextWord() {
  const now = Date.now();
  const dueWords = wordsData.filter(
    (wordObj) => wordObj.nextReview <= now
  );
  
  // Update progress stats
  totalWordsForSession = dueWords.length + wordsCompleted;
  updateProgress();
  
  if (dueWords.length === 0) {
    testContainer.innerHTML = `
      <div class="completion-message">
        <h2>WELL DONE!</h2>
        <p>Check back later for another round of practice.</p>
      </div>
    `;
    return;
  }
  dueWords.sort((a, b) => a.nextReview - b.nextReview);
  const currentWordObj = dueWords[0];
  startTestForWord(currentWordObj);
}

// Start the test for a given word object
function startTestForWord(wordObj) {
  testContainer.innerHTML = "";

  // Create all elements first
  const lettersContainer = document.createElement("div");
  lettersContainer.classList.add("letters-container");

  // Create inputs...
  const letterInputs = [];
  for (let i = 0; i < wordObj.word.length; i++) {
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = "1";
    input.classList.add("letter-input");
    
    input.addEventListener("input", () => {
      // Remove any previous states
      input.classList.remove('incorrect', 'correct');
      
      // If empty, reset the input style
      if (input.value === '') {
        return;
      }
      
      // Check if the letter is correct
      if (input.value.toLowerCase() === wordObj.word[i].toLowerCase()) {
        input.classList.add('correct');
      } else {
        input.classList.add('incorrect');
      }
      
      // Move to next input if available
      if (input.value.length === 1 && letterInputs[i + 1]) {
        letterInputs[i + 1].focus();
      }
      
      // Check full word if this is the last input
      if (input.value.length === 1 && i === wordObj.word.length - 1) {
        checkSpelling(wordObj, letterInputs);
      }
    });

    // Add keydown event listener for Enter key and Backspace
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        checkSpelling(wordObj, letterInputs);
      }
      // Handle backspace/delete
      if ((e.key === "Backspace" || e.key === "Delete") && input.value === "") {
        e.preventDefault(); // Prevent the default backspace behavior
        if (letterInputs[i - 1]) {
          letterInputs[i - 1].focus();
          letterInputs[i - 1].value = "";
        }
      }
    });

    lettersContainer.appendChild(input);
    letterInputs.push(input);
  }
  testContainer.appendChild(lettersContainer);

  const actionButtons = document.createElement("div");
  actionButtons.classList.add("action-buttons");

  const readButton = document.createElement("button");
  readButton.classList.add("icon-button", "listen");
  readButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
    Listen
  `;
  
  const checkButton = document.createElement("button");
  checkButton.classList.add("icon-button", "check");
  checkButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    Check
  `;

  actionButtons.appendChild(readButton);
  actionButtons.appendChild(checkButton);
  testContainer.appendChild(actionButtons);

  // Remove feedback element creation and reference
  checkButton.addEventListener("click", () => {
    checkSpelling(wordObj, letterInputs);
  });

  // Add this to handle mobile keyboard
  letterInputs.forEach(input => {
    input.addEventListener('focus', () => {
      if (isMobile()) {
        setTimeout(() => {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    });
  });

  // Add the click event listener for the read button to play again
  readButton.addEventListener("click", () => {
    readWord(wordObj.word);
  });

  // Play word and focus first input after everything is rendered
  requestAnimationFrame(() => {
    readWord(wordObj.word);
    setTimeout(() => {
      letterInputs[0].focus();
    }, 300);
  });
}

// Use the Web Speech API to read the word aloud
function readWord(word) {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.7; // Slower speed (0.1 to 10, 1.0 is normal speed)
    utterance.pitch = 1.0; // Normal pitch
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Sorry, your browser does not support speech synthesis.");
  }
}

// Variables for progress tracking
let wordsCompleted = 0;
let totalWordsForSession = 0;

// Update progress display
function updateProgress() {
  const progressFill = document.querySelector('.progress-fill');
  const wordsCompletedEl = document.querySelector('.words-completed');
  const wordsRemainingEl = document.querySelector('.words-remaining');
  
  const progressPercentage = totalWordsForSession ? (wordsCompleted / totalWordsForSession) * 100 : 0;
  progressFill.style.width = `${progressPercentage}%`;
  
  wordsCompletedEl.textContent = wordsCompleted;
  wordsRemainingEl.textContent = totalWordsForSession;
}

// Update the checkSpelling function
function checkSpelling(wordObj, letterInputs) {
  const userSpelling = letterInputs.map((input) => input.value).join("");
  
  if (userSpelling.toLowerCase() === wordObj.word.toLowerCase()) {
    // Correct word - add success animation to all inputs
    letterInputs.forEach(input => {
      input.classList.add('correct');
    });
    
    wordObj.interval = wordObj.interval
      ? wordObj.interval * 2
      : DEFAULT_INTERVAL;
    wordObj.nextReview = Date.now() + wordObj.interval;
    updateWordListDisplay();
    
    wordsCompleted++;
    updateProgress();
    
    setTimeout(loadNextWord, 1500);
  } else {
    // Check each letter and animate incorrect ones
    letterInputs.forEach((input, index) => {
      if (input.value.toLowerCase() !== wordObj.word[index].toLowerCase()) {
        input.classList.add('incorrect');
        setTimeout(() => input.classList.remove('incorrect'), 500);
      }
    });
    
    wordObj.interval = DEFAULT_INTERVAL;
    wordObj.nextReview = Date.now() + DEFAULT_INTERVAL;
    updateWordListDisplay();
  }
}

// Add close button functionality
const closeButton = document.querySelector('.close-panel');
closeButton.addEventListener('click', () => {
  wordListPanel.classList.remove('open');
  document.body.style.overflow = '';
}); 