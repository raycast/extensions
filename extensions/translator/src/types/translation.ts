import { SupportedLanguage } from "./language";

export interface TranslationResult {
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  translatedText: string;
  usedProfileName: string;
}

export interface SubmitTranslationInput {
  text: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
}
