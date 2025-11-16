export interface LanguageConfig {
  // Word source data
  wordSource: string[] | (() => string[]);

  // Letter frequency data for scoring
  letterFrequency: { [key: string]: number };

  // Optimal starting words for each length
  startingWords: { [key: number]: string[] };

  // Language-specific filtering rules
  wordFilter: {
    minLength: number;
    maxLength: number;
    allowAccents: boolean;
    excludedCharacters: string[];
    customFilter?: (word: string) => boolean;
  };

  // Position-based scoring rules
  positionScoring: {
    commonFirstLetters: string[];
    commonLastLetters: string[];
    firstLetterBonus: number;
    lastLetterBonus: number;
  };

  // UI text/labels
  ui: {
    language: string;
    lengthLabel: string;
    suggestionLabel: string;
    testedWordsLabel: string;
    analysisLabel: string;
    resetLabel: string;
    noSuggestionTitle: string;
    noSuggestionMessage: string;
    lengthSetTitle: string;
    lengthSetMessage: (length: number) => string;
    feedbackSavedTitle: string;
    feedbackSavedMessage: string;
    resetTitle: string;
    resetMessage: string;

    // Action labels
    setLengthAction: string;
    newSuggestionAction: string;
    getSuggestionAction: string;
    resetAction: string;
    submitFeedbackAction: string;
    cancelAction: string;

    // Additional UI labels
    tryWordLabel: string;
    testedWordCount: string;
    wordsRemainingLabel: string;
    eliminatedLabel: string;
    averageScoreLabel: string;
    feedbackPrompt: string;
    letterLabel: string;
    correctPositionLabel: string;
    wrongPositionLabel: string;
    notInWordLabel: string;
    lettersUnit: string; // for "4 letters", "5 letters", etc.
  };
}
