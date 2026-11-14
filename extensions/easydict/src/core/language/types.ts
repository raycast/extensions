/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { languageCatalog } from "./catalog";

/** Internal codes retain their existing persisted values. Provider codes are mapped separately. */
export type SourceLanguage = keyof typeof languageCatalog;
export type LanguageCode = Exclude<SourceLanguage, "auto">;

export interface ProviderLanguageCodes {
  googleLangCode?: string;
  volcanoLangCode?: string;
  bingLangCode?: string;
  appleLangCode?: string;
  deepLSourceId?: string;
  deepLTargetId?: string;
  francLangCode?: string;
  baiduLangCode?: string;
  caiyunLangCode?: string;
}

/** English Wiktionary language headings and translation-table codes, eg. `Norwegian Bokmål` and `nb`. */
export interface WiktionaryLanguage {
  names: readonly string[];
  codes: readonly string[];
  latinOnly?: boolean;
}

export interface LanguageDefinition {
  langEnglishName: string;
  langChineseName: string;
  emoji: string;
  voiceList?: { macOS?: readonly string[]; Windows?: readonly string[] };
  codes: ProviderLanguageCodes;
  /** Only where Wiktionary differs from `langEnglishName` and the internal code. */
  wiktionary?: WiktionaryLanguage;
}

export interface LanguageItem extends Omit<LanguageDefinition, "codes" | "wiktionary"> {
  youdaoLangCode: SourceLanguage;
}
