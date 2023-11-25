import { GUESS_LIMIT, LANGUAGE_WORDSET_MAP, WORD_LENGTH } from "@src/constants";
import { Guess, Hint, Language } from "@src/types";
import { determineHints, getHashedNumberByDate } from "@src/util";
import { usePersistence } from "@src/hooks";

export type UseWordleReturnType = {
  guesses: Guess[];
  remainingGuesses: number;
  guessCount: number;
  isGuessingSuccessful: boolean;
  isLoading: boolean;
  date: Date;
  solution: string;
  language: Language;
  makeGuess: (word: string) => Promise<void>;
  checkIfWordExists: (word: string) => boolean;
};

export const useWordle = (language: Language): UseWordleReturnType => {
  const { activeEntry, setEntry, isLoading } = usePersistence([language]);

  const date: Date = activeEntry?.date ?? new Date();

  const wordSet = LANGUAGE_WORDSET_MAP[language];
  const wordSetIndex = getHashedNumberByDate({ date, max: wordSet.length });
  const solution = wordSet[wordSetIndex];

  const guesses: Guess[] =
    activeEntry?.wordsOfGuesses.map((word) => {
      const hints: Hint[] = determineHints(word, solution);
      const guess: Guess = { word, hints };
      return guess;
    }) ?? [];

  const makeGuess = async (word: string): Promise<void> => {
    if (word.length !== WORD_LENGTH) return;

    const wordsOfGuesses = guesses.map((guess) => guess.word);
    await setEntry({ language, wordsOfGuesses: [...wordsOfGuesses, word], date, solution });
  };

  const guessCount = guesses.length;
  const guessLimitCountDifference = GUESS_LIMIT - guessCount;
  const remainingGuesses = guessLimitCountDifference > 0 ? guessLimitCountDifference : 0;

  const checkIfWordExists = (word: string) => wordSet.includes(word);
  const isGuessingSuccessful = guesses.map((guess) => guess.word).includes(solution);

  return {
    guesses,
    remainingGuesses,
    guessCount,
    isGuessingSuccessful,
    date,
    makeGuess,
    checkIfWordExists,
    isLoading,
    solution,
    language,
  };
};
