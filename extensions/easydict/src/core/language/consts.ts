/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { languageCatalog } from "./catalog";
import type { LanguageDefinition, LanguageItem, SourceLanguage } from "./types";

const catalog: Record<SourceLanguage, LanguageDefinition> = languageCatalog;
const sourceLanguages = Object.keys(catalog) as SourceLanguage[];
export const languageItemList: LanguageItem[] = sourceLanguages.map((code) => {
  const { langEnglishName, langChineseName, emoji, voiceList } = catalog[code];
  return { youdaoLangCode: code, langEnglishName, langChineseName, emoji, voiceList };
});

export const chineseLanguageItem = languageItemList[1];
export const englishLanguageItem = languageItemList[2];
