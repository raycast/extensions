import { Color } from "@raycast/api";

export enum HintType {
  CORRECT_POSITION,
  INCORRECT_POSITION,
  NON_EXISTENT,
}

export enum Language {
  ENGLISH_US = "en-US",
  GERMAN_DE = "de-DE",
}

export enum EntryState {
  SUCCESS = "Success",
  FAILURE = "Failure",
  IN_PROGRESS = "In progress",
}

export type Hint = { value: string; type: HintType };

export type Guess = {
  word: string;
  hints: Hint[];
};

export type ValidatorAccessory = {
  id: string;
  accessory: { tag: { value: string; color: Color } };
  validators: boolean[];
};

export type LocalStorageEntry = {
  language: Language;
  date: Date;
  solution: string;
  wordsOfGuesses: string[];
};

export type LanguageWordSetMap = {
  [key in Language]: string[];
};

export type LanguageUnicodeMap = {
  [key in Language]: string;
};

export type EntryStateColorMap = {
  [key in EntryState]: { color: Color; condition: boolean };
};

export type HintTypeUnicodeMap = {
  [key in HintType]: string;
};
