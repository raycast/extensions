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

export interface Translation {
  translation: string;
  pos: string;
}

export interface UsageExample {
  sExample: string;
  tExample: string;
  sLang: LangCode;
  tLang: LangCode;
  sText: string;
  tText: string;
}

export interface Contexts {
  examples: UsageExample[];
  translations: Translation[];
  ipa: string;
  searchText: string;
}

export interface Preferences {
  langFrom: LangCode;
  langTo: LangCode;
  correctLangPairDirection: boolean;
}

export interface AllPreferences {
  langFrom: LangCode;
  langTo: LangCode;
  correctLangPairDirection: boolean;
  langFrom_2nd: LangCode;
  langTo_2nd: LangCode;
  correctLangPairDirection_2nd: boolean;
}
