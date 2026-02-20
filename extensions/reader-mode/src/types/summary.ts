/**
 * Summary style types for article summarization
 */
export type SummaryStyle =
  | "overview"
  | "opposite-sides"
  | "five-ws"
  | "eli5"
  | "entities"
  | "comprehensive"
  | "at-a-glance";

/**
 * Supported languages for translation (BCP 47 locale codes)
 */
export type SupportedLanguage =
  | "en-US"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "it-IT"
  | "pt-BR"
  | "ja-JP"
  | "zh-Hans"
  | "zh-Hant"
  | "ko-KR"
  | "ru-RU"
  | "ar-SA"
  | "hi-IN"
  | "nl-NL"
  | "pl-PL"
  | "sv-SE"
  | "tr-TR"
  | "vi-VN"
  | "th-TH"
  | "el-GR"
  | "he-IL";

/**
 * Options for translated summary style
 */
export interface TranslationOptions {
  language: SupportedLanguage;
  level?: "beginner" | "intermediate" | "advanced";
}

/**
 * Summary result from AI
 */
export interface SummaryResult {
  style: SummaryStyle;
  summary: string;
}
