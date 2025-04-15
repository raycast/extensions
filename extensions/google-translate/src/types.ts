import { LanguageCode } from "./languages";

export type LanguageCodeSet = {
  langFrom: LanguageCode;
  langTo: LanguageCode[];
  proxy?: string;
};

export type TranslatePreferences = {
  lang1: LanguageCode;
  lang2: LanguageCode;
  autoInput: boolean;
  proxy?: string;
};
