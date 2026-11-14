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
  tencentDetectCode?: string;
  tencentLangCode?: string;
  baiduLangCode?: string;
  caiyunLangCode?: string;
}

export interface LanguageDefinition {
  langEnglishName: string;
  langChineseName: string;
  emoji: string;
  voiceList?: { macOS?: readonly string[]; Windows?: readonly string[] };
  codes: ProviderLanguageCodes;
}

export interface LanguageItem extends Omit<LanguageDefinition, "codes"> {
  youdaoLangCode: SourceLanguage;
}
