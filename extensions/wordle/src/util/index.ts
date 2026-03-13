import sum from "hash-sum";
import { Hint, HintType, Language, LocalStorageEntry } from "@src/types";
import { showToast, Toast } from "@raycast/api";

export const getUppercaseValue = (value: string) => value.toUpperCase();

export const determineHints = (word: string, solution: string): Hint[] => {
  const guessCharacters = Array.from(word);
  const solutionCharacters = Array.from(solution);
  const solutionCharacterDictionary = solutionCharacters.reduce((dictionary, char) => {
    const dictionaryValue = dictionary.get(char);
    if (!dictionaryValue) return dictionary.set(char, 1);
    return dictionary.set(char, dictionaryValue + 1);
  }, new Map<string, number>());

  const hintsWithCorrectPositions = guessCharacters.map((char, index) => {
    let type: HintType;
    const solutionCharacterDictionaryValue = solutionCharacterDictionary.get(char);
    if (!solutionCharacterDictionaryValue) return { value: char, type: HintType.NON_EXISTENT };

    if (char === solution[index]) {
      type = HintType.CORRECT_POSITION;
      solutionCharacterDictionary.set(char, solutionCharacterDictionaryValue - 1);
    } else type = HintType.NON_EXISTENT;

    return { value: char, type };
  });

  const hintsWithAllTypes = hintsWithCorrectPositions.map((hint) => {
    const solutionCharacterDictionaryValue = solutionCharacterDictionary.get(hint.value);
    if (!solutionCharacterDictionaryValue) return hint;

    if (hint.type === HintType.CORRECT_POSITION) return hint;

    if (solution.includes(hint.value) && solutionCharacterDictionaryValue > 0) {
      solutionCharacterDictionary.set(hint.value, solutionCharacterDictionaryValue - 1);
      return { ...hint, type: HintType.INCORRECT_POSITION };
    }
    return hint;
  });

  return hintsWithAllTypes;
};

const isNumberEven = (number: number): boolean => number % 2 === 0;

export const getHashedNumberByDate = ({ date, max }: { date: Date; max: number }): number => {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const valueToHash = `${day}raycast${month}salt${year}`;

  const hashedValue = sum(valueToHash);
  const hashedValueDecimal = parseInt(hashedValue, 16);

  if (isNumberEven(hashedValueDecimal)) {
    const result = (hashedValueDecimal + 1) * day;
    return result % max;
  }

  const result = (hashedValueDecimal + 3) * (month - day);
  if (result < 0) return (result * -1) % max;
  return result % max;
};

export const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getDate() == today.getDate() &&
    date.getMonth() == today.getMonth() &&
    date.getFullYear() == today.getFullYear()
  );
};

export const parseStorageValues = (storageValues: { [key: string]: string }): LocalStorageEntry[] => {
  const entries = Object.entries(storageValues);
  const parsedEntries = entries.map(([, value]) => {
    const { date, language, solution, wordsOfGuesses }: LocalStorageEntry = JSON.parse(value);

    return {
      language,
      date: new Date(date),
      solution,
      wordsOfGuesses,
    };
  });

  return parsedEntries;
};

export const incrementDate = (date: Date): Date => {
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

export const formatTime = (time: number): string => {
  return ("0" + time).slice(-2);
};

export const isSameDay = (firstDate: Date, secondDate: Date): boolean => {
  const firstDateFormatted = `${firstDate.getMonth}${firstDate.getDate}${firstDate.getFullYear}`;
  const secondDateFormatted = `${secondDate.getMonth}${secondDate.getDate}${secondDate.getFullYear}`;

  return firstDateFormatted === secondDateFormatted;
};

export const showErrorToast = async ({ title, message }: { title: string; message?: string }) => {
  const options: Toast.Options = {
    style: Toast.Style.Failure,
    title: title,
    message: message,
  };
  await showToast(options);
};

export const showSuccessToast = async ({ title, message }: { title: string; message?: string }) => {
  const options: Toast.Options = {
    style: Toast.Style.Success,
    title: title,
    message: message,
  };
  await showToast(options);
};

export const getLocalStorageEntryId = ({ language, date }: { language: Language; date: Date }) =>
  `${language}-${date.getMonth()}/${date.getDate()}/${date.getFullYear()}`;
