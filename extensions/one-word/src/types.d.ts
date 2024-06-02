import { MenuBarExtra } from "@raycast/api";
import { LANGUAGES, SUPPORTED_LANGUAGES_API, UPDATE_INTERVALS } from "./constants";

export type MenuBarItemProps = Parameters<typeof MenuBarExtra.Item>[0];

declare global {
  interface WordEntry {
    word: string;
    translation: string;
    wordLanguageCode: LanguageCode;
    translationLanguageCode: LanguageCode;
    timestamp: number;
  }
}

export interface WordEntryProps {
  wordEntry: WordEntry;
}

export type LanguageCode = keyof typeof LANGUAGES;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES_API)[number];
export type LanguageTitle = (typeof LANGUAGES)[LanguageCode]["title"];
export type Language = {
  key: LanguageCode;
  title: LanguageTitle;
  icon?: Image.ImageLike;
};

export interface MenuBarPreferences {
  menuBarIcon: string;
  showGetNewWord: boolean;
  showPronunciation: boolean;
  showFav: boolean;
  showCopy: boolean;
}

export type Interval = (typeof UPDATE_INTERVALS)[number];
