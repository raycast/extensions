import { LanguageCode } from "./languages";

export type LanguageCodeSet = {
  langFrom: LanguageCode;
  langTo: LanguageCode[];
};

export type TranslatePreferences = {
  lang1: LanguageCode;
  lang2: LanguageCode;
  autoInput: boolean;
};
