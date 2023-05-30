import { LanguageCode } from "./languages";

export type LanguageCodeSet = { langFrom: LanguageCode; langTo: LanguageCode };

export type TranslatePreferences = {
  autoPasteClipboardText?: boolean;
  lang1: LanguageCode;
  lang2: LanguageCode;
};
