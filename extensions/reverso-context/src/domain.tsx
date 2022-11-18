export enum LangCode {
  RU = "ru",
  EN = "en",
}

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
