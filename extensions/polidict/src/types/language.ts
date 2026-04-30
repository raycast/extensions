export type SupportedLanguageCode =
  | "en-US"
  | "en-GB"
  | "es-ES"
  | "es-MX"
  | "uk-UA"
  | "pl-PL"
  | "fr-FR"
  | "fr-CA"
  | "de-DE"
  | "de-AT"
  | "de-CH"
  | "it-IT"
  | "ko-KR"
  | "ja-JP"
  | "sv-SE"
  | "ar-SA"
  | "ar-EG"
  | "nl-NL"
  | "nl-BE";

export interface SupportedLanguage {
  languageCode: SupportedLanguageCode;
  languageName: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguageCode, SupportedLanguage> = {
  "en-US": { languageCode: "en-US", languageName: "English (US)" },
  "en-GB": { languageCode: "en-GB", languageName: "English (UK)" },
  "es-ES": { languageCode: "es-ES", languageName: "Español (España)" },
  "es-MX": { languageCode: "es-MX", languageName: "Español (México)" },
  "uk-UA": { languageCode: "uk-UA", languageName: "Українська" },
  "pl-PL": { languageCode: "pl-PL", languageName: "Polski" },
  "fr-FR": { languageCode: "fr-FR", languageName: "Français (France)" },
  "fr-CA": { languageCode: "fr-CA", languageName: "Français (Canada)" },
  "de-DE": {
    languageCode: "de-DE",
    languageName: "Deutsch (Deutschland)",
  },
  "de-AT": {
    languageCode: "de-AT",
    languageName: "Deutsch (Österreich)",
  },
  "de-CH": { languageCode: "de-CH", languageName: "Deutsch (Schweiz)" },
  "it-IT": { languageCode: "it-IT", languageName: "Italiano" },
  "ko-KR": { languageCode: "ko-KR", languageName: "한국어" },
  "ja-JP": { languageCode: "ja-JP", languageName: "日本語" },
  "sv-SE": { languageCode: "sv-SE", languageName: "Svenska" },
  "ar-SA": { languageCode: "ar-SA", languageName: "العربية (السعودية)" },
  "ar-EG": { languageCode: "ar-EG", languageName: "العربية (مصر)" },
  "nl-NL": {
    languageCode: "nl-NL",
    languageName: "Nederlands (Nederland)",
  },
  "nl-BE": {
    languageCode: "nl-BE",
    languageName: "Nederlands (België)",
  },
};
