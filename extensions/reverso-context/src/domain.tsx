export type LangCode =
  | "ru"
  | "en"
  | "de"
  | "ar"
  | "es"
  | "fr"
  | "he"
  | "it"
  | "ja"
  | "nl"
  | "pl"
  | "pt"
  | "ro"
  | "sv"
  | "tr"
  | "uk"
  | "zh";

export interface LangPair {
  from: LangCode;
  to: LangCode;
}

export interface UsageExample {
  sExample: string;
  tExample: string;
  sLang: LangCode;
  tLang: LangCode;
  sText: string;
  tText: string;
  source: string;
  sourceUrl: string;
}
