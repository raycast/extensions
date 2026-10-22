/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { languageCatalog } from "./catalog";
import { languageItemList } from "./consts";
import type { LanguageCode, LanguageDefinition, LanguageItem, ProviderLanguageCodes, SourceLanguage } from "./types";

export const maxLineLengthOfChineseTextDisplay = 45;
export const maxLineLengthOfEnglishTextDisplay = 90;

const catalog: Record<SourceLanguage, LanguageDefinition> = languageCatalog;

export function isSourceLanguage(value: unknown): value is SourceLanguage {
  return typeof value === "string" && Object.hasOwn(catalog, value);
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return value !== "auto" && isSourceLanguage(value);
}

/** Normalize manifest aliases while preserving existing query and storage codes. */
export function parseSourceLanguage(value: unknown): SourceLanguage | undefined {
  if (value === "fil") return "tl";
  if (value === "sr") return "sr-Latn";
  return isSourceLanguage(value) ? value : undefined;
}

export function lookupLanguageItem(code: string): LanguageItem | undefined {
  const language = parseSourceLanguage(code);
  return languageItemList.find((item) => item.youdaoLangCode === language);
}

export function getLanguageItem(code: string): LanguageItem {
  const item = lookupLanguageItem(code);
  if (!item) throw new Error(`Unknown language: ${code}`);
  return item;
}

export function getLangCode(code: string, field: keyof ProviderLanguageCodes): string | undefined {
  const language = parseSourceLanguage(code);
  return language === undefined ? undefined : catalog[language].codes[field];
}

/** DeepL source/franc historically choose the first match; other provider maps choose the last. */
export function getLanguageFromProviderCode(
  code: string,
  field: keyof ProviderLanguageCodes,
): SourceLanguage | undefined {
  if (!code) return undefined;
  const matches = (item: LanguageItem) => catalog[item.youdaoLangCode].codes[field] === code;
  const item =
    field === "deepLSourceId" || field === "francLangCode"
      ? languageItemList.find(matches)
      : languageItemList.findLast(matches);
  return item?.youdaoLangCode;
}

export function getLanguageItemFromDeepLSourceCode(code: string): LanguageItem | undefined {
  const language = getLanguageFromProviderCode(code, "deepLSourceId");
  return language === undefined ? undefined : getLanguageItem(language);
}

export function getLanguageEnglishName(code: string): string {
  return lookupLanguageItem(code)?.langEnglishName ?? code;
}

export function getLanguageOfTwoExceptChinese(codes: [string, string]): string | undefined {
  if (codes.includes("zh-CHS")) return codes[0] === "zh-CHS" ? codes[1] : codes[0];
}
