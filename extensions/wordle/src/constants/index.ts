import {
  HintType,
  HintTypeUnicodeMap,
  Language,
  LanguageKeyboardLayoutMap,
  LanguageUnicodeMap,
  LanguageWordSetMap,
} from "@src/types";
import { WORDS_EN_US, WORDS_DE_DE } from "@src/constants";

export const EXTENSION_AUTHOR_NAME = "chrisalxlng";

export * from "./words/en-US";
export * from "./words/de-DE";

export const LANGUAGE_WORDSET_MAP: LanguageWordSetMap = {
  [Language.ENGLISH_US]: WORDS_EN_US,
  [Language.GERMAN_DE]: WORDS_DE_DE,
};
export const LANGUAGE_UNICODE_MAP: LanguageUnicodeMap = {
  [Language.ENGLISH_US]: "🇺🇸",
  [Language.GERMAN_DE]: "🇩🇪",
};

export const LANGUAGE_KEYBOARD_LAYOUT_MAP: LanguageKeyboardLayoutMap = {
  [Language.ENGLISH_US]: ["qwertyuiop", "asdfghjkl", "zxcvbnm"],
  [Language.GERMAN_DE]: ["qwertzuiop", "asdfghjkl", "yxcvbnm"],
};

export const WORD_LENGTH = 5;
export const GUESS_LIMIT = 6;
export const HINT_TYPE_UNICODE_MAP: HintTypeUnicodeMap = {
  [HintType.CORRECT_POSITION]: "🟩",
  [HintType.INCORRECT_POSITION]: "🟨",
  [HintType.NON_EXISTENT]: "⬜",
};
