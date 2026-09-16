import type { SupportedLanguage } from "./domain";

export interface TranslationResult {
  text: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  provider: string;
}

export interface TranslationProvider {
  translate(text: string): Promise<TranslationResult>;
}
