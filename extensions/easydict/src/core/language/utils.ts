/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { languageItemList } from "./consts";
import type { LanguageItem } from "./types";

export const maxLineLengthOfChineseTextDisplay = 45;
export const maxLineLengthOfEnglishTextDisplay = 90;

type LangCodeKeys = {
  [K in keyof LanguageItem]: LanguageItem[K] extends string | undefined ? K : never;
}[keyof LanguageItem];

export function getLanguageItem(youdaoCode: string): LanguageItem {
  return languageItemList.find((i) => i.youdaoLangCode === youdaoCode) ?? languageItemList[0];
}

export function getLangCode<K extends Extract<keyof LanguageItem, LangCodeKeys>>(
  youdaoCode: string,
  field: K,
): LanguageItem[K] {
  const item = getLanguageItem(youdaoCode);
  return item[field];
}

function buildReverseMap(field: LangCodeKeys): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of languageItemList) {
    const code = item[field as keyof LanguageItem] as string | undefined;
    if (code) map.set(code, item.youdaoLangCode);
  }
  return map;
}

export const bingMap = buildReverseMap("bingLangCode");
export const googleMap = buildReverseMap("googleLangCode");
export const baiduMap = buildReverseMap("baiduLangCode");
export const tencentMap = buildReverseMap("tencentLangCode");
export const tencentDetectMap = buildReverseMap("tencentDetectCode");
export const volcanoMap = buildReverseMap("volcanoLangCode");

export function getYoudaoLangCode(serviceCode: string, map: Map<string, string>): string {
  return map.get(serviceCode) ?? languageItemList[0].youdaoLangCode;
}

/**
 * Return language item from deepL language id, if not found, return auto language item
 */
export function getLanguageItemFromDeepLSourceCode(deepLLangCode: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.deepLSourceId === deepLLangCode) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * Get language item from franc language code.
 */
export function getLanguageItemFromFrancCode(francLangCode: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.francLangCode === francLangCode) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * Get language title from youdao language code. eg. en -> English
 */
export function getLanguageEnglishName(youdaoLangCode: string): string {
  return getLanguageItem(youdaoLangCode).langEnglishName;
}

/**
 * Check language code is valid, except 'auto', ''
 */
export function isValidLangCode(LangCode: string): boolean {
  if (LangCode === "auto" || LangCode.length === 0) {
    return false;
  }
  return true;
}

/**
 * Get another language item except chinese from language item array.
 *
 * eg: [en, zh-CHS] --> en
 * eg: [zh-CHS, fr] --> fr
 */
export function getLanguageOfTwoExceptChinese(youdaoLangCodes: [string, string]): string | undefined {
  if (youdaoLangCodes.includes("zh-CHS")) {
    return youdaoLangCodes[0] === "zh-CHS" ? youdaoLangCodes[1] : youdaoLangCodes[0];
  }
}
