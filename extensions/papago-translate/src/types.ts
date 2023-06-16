export interface Preferences {
  source: string;
  target: string;
  clientId: string;
  clientSecret: string;
}

export interface DetectLangsResponse {
  langCode: string;
}

export interface N2MTResponse {
  message: {
    result: {
      srcLangType: string;
      tarLangType: string;
      translatedText: string;
    };
  };
}

export type SearchText = string;

export type TargetLang = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "id" | "th" | "de" | "ru" | "es" | "it" | "fr";
