import frenchWords from "an-array-of-french-words";
import type { LanguageConfig } from "./languageConfig";

// French letter frequency based on corpus analysis
const FRENCH_LETTER_FREQUENCY: { [key: string]: number } = {
  e: 12.02,
  s: 7.9,
  a: 7.11,
  r: 6.46,
  n: 7.15,
  t: 7.24,
  i: 6.64,
  o: 5.14,
  l: 5.34,
  u: 6.24,
  d: 3.67,
  c: 3.18,
  m: 2.62,
  p: 2.49,
  b: 1.13,
  v: 2.15,
  h: 0.64,
  f: 1.06,
  g: 0.87,
  y: 0.46,
  q: 0.65,
  j: 0.45,
  x: 0.54,
  z: 0.21,
  k: 0.16,
  w: 0.04,
};

// Optimal starting words based on French letter frequency and vowel distribution
// These words prioritize common letters: E, A, R, I, S, T, N, O, L
const FRENCH_STARTING_WORDS: { [key: number]: string[] } = {
  4: ["AIRE", "ARTS", "OSER", "LENT", "RIEN"],
  5: ["ARISE", "SONAR", "SALON", "NOTRE", "TRAIN"],
  6: ["SOIENT", "ENTRAI", "ORNAIS", "SOLEIL", "TRAIES"],
  7: ["SENTIRA", "ENTRAIS", "ORANTES", "TRAITES", "ORNATES"],
  8: ["ENTRAINS", "ORATEURS", "TRAINEES", "ORNATES", "SENTIRAS"],
};

export const frenchConfig: LanguageConfig = {
  wordSource: frenchWords as string[],

  letterFrequency: FRENCH_LETTER_FREQUENCY,

  startingWords: FRENCH_STARTING_WORDS,

  wordFilter: {
    minLength: 4,
    maxLength: 8,
    allowAccents: false,
    excludedCharacters: ["-", " ", "'", ".", ",", "_", "ç", "Ç"],
    customFilter: (word: string) => {
      const normalizedWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const basicLettersOnly = /^[a-zA-Z]+$/;
      const hasAccents = word !== normalizedWord;

      return basicLettersOnly.test(word) && !hasAccents;
    },
  },

  positionScoring: {
    commonFirstLetters: ["s", "c", "p", "m", "r", "l", "t", "d"],
    commonLastLetters: ["s", "e", "r", "t", "n"],
    firstLetterBonus: 2,
    lastLetterBonus: 1.5,
  },

  ui: {
    language: "Français",
    lengthLabel: "Longueur du mot",
    suggestionLabel: "Suggestion actuelle",
    testedWordsLabel: "Mots testés",
    analysisLabel: "Analyse",
    resetLabel: "Réinitialiser",
    noSuggestionTitle: "Aucune suggestion",
    noSuggestionMessage: "Aucun mot ne correspond aux critères",
    lengthSetTitle: "Longueur définie",
    lengthSetMessage: (length: number) => `Prêt à suggérer des mots de ${length} lettres`,
    feedbackSavedTitle: "Retour enregistré",
    feedbackSavedMessage: "Prêt pour la prochaine suggestion",
    resetTitle: "Réinitialisation",
    resetMessage: "Toutes les données effacées",

    // Action labels
    setLengthAction: "Définir la longueur",
    newSuggestionAction: "Nouvelle suggestion",
    getSuggestionAction: "Obtenir suggestion",
    resetAction: "Réinitialiser",
    submitFeedbackAction: "Valider le retour",
    cancelAction: "Annuler",

    // Additional UI labels
    tryWordLabel: "Essayez ce mot",
    testedWordCount: "mot(s) testé(s)",
    wordsRemainingLabel: "mots restants",
    eliminatedLabel: "éliminés",
    averageScoreLabel: "Score moyen",
    feedbackPrompt: "Donnez votre retour pour",
    letterLabel: "Lettre",
    correctPositionLabel: "Bonne position",
    wrongPositionLabel: "Mauvaise position",
    notInWordLabel: "Pas dans le mot",
    lettersUnit: "lettres",
  },
};
