export type Platform = "web" | "ios" | "android" | "other";

export interface TranslationKey {
  keyId: number;
  keyName: string;
  defaultTranslation: string;
  mainTranslation: string;
  platforms: string[];
  isPlural: boolean;
  tags: string[];
  description?: string;
  context?: string;
  createdAt?: string;
  modifiedAt?: string;
  translations: Translation[];
  screenshots: Screenshot[];
}

export interface Translation {
  languageIso: string;
  languageName: string;
  text: string;
}

export interface Screenshot {
  url: string;
  title: string;
}
