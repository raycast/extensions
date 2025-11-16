// English words package (similar structure to the French package)
// Installed with: npm install an-array-of-english-words

import englishWords from "an-array-of-english-words";
import type { LanguageConfig } from "./languageConfig";

// English letter frequency based on corpus analysis
const ENGLISH_LETTER_FREQUENCY: { [key: string]: number } = {
  e: 12.7,
  t: 9.1,
  a: 8.2,
  o: 7.5,
  i: 7.0,
  n: 6.7,
  s: 6.3,
  h: 6.1,
  r: 6.0,
  d: 4.3,
  l: 4.0,
  c: 2.8,
  u: 2.8,
  m: 2.4,
  w: 2.4,
  f: 2.2,
  g: 2.0,
  y: 2.0,
  p: 1.9,
  b: 1.3,
  v: 1.0,
  k: 0.8,
  j: 0.15,
  x: 0.15,
  q: 0.1,
  z: 0.07,
};

// Optimal starting words for English Wordle
const ENGLISH_STARTING_WORDS: { [key: number]: string[] } = {
  4: ["TIRE", "ARTS", "LOSE", "SENT", "NEAR"],
  5: ["AROSE", "ADIEU", "AUDIO", "OURIE", "RAISE"],
  6: ["STONER", "TRAILS", "REASON", "SOILED", "TENORS"],
  7: ["AROUSED", "AROINTS", "ALIONES", "AROUSED", "SOLATIA"],
  8: ["AROUSING", "RESOLUTE", "ABSOLUTE", "SOLITARE", "TEARINGS"],
};

export const englishConfig: LanguageConfig = {
  wordSource: englishWords as string[],

  letterFrequency: ENGLISH_LETTER_FREQUENCY,

  startingWords: ENGLISH_STARTING_WORDS,

  wordFilter: {
    minLength: 4,
    maxLength: 8,
    allowAccents: false,
    excludedCharacters: ["-", " ", "'", ".", ",", "_"],
    customFilter: (word: string) => {
      const basicLettersOnly = /^[a-zA-Z]+$/;
      return basicLettersOnly.test(word);
    },
  },

  positionScoring: {
    commonFirstLetters: ["s", "c", "b", "p", "t", "a", "f", "d"],
    commonLastLetters: ["s", "e", "y", "d", "n", "t", "r"],
    firstLetterBonus: 2,
    lastLetterBonus: 1.5,
  },

  ui: {
    language: "English",
    lengthLabel: "Word length",
    suggestionLabel: "Current suggestion",
    testedWordsLabel: "Tested words",
    analysisLabel: "Analysis",
    resetLabel: "Reset",
    noSuggestionTitle: "No suggestion",
    noSuggestionMessage: "No words match the criteria",
    lengthSetTitle: "Length set",
    lengthSetMessage: (length: number) => `Ready to suggest ${length}-letter words`,
    feedbackSavedTitle: "Feedback saved",
    feedbackSavedMessage: "Ready for next suggestion",
    resetTitle: "Reset",
    resetMessage: "All data cleared",

    // Action labels
    setLengthAction: "Set Length",
    newSuggestionAction: "New Suggestion",
    getSuggestionAction: "Get Suggestion",
    resetAction: "Reset",
    submitFeedbackAction: "Submit Feedback",
    cancelAction: "Cancel",

    // Additional UI labels
    tryWordLabel: "Try this word",
    testedWordCount: "word(s) tested",
    wordsRemainingLabel: "words remaining",
    eliminatedLabel: "eliminated",
    averageScoreLabel: "Average score",
    feedbackPrompt: "Give feedback for",
    letterLabel: "Letter",
    correctPositionLabel: "Correct position",
    wrongPositionLabel: "Wrong position",
    notInWordLabel: "Not in word",
    lettersUnit: "letters",
  },
};
