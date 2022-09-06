/*
 * @author: tisfeng
 * @createTime: 2022-08-05 10:54
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-28 00:35
 * @fileName: languages.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { francLangaugeDetect } from "../detectLanauge/franc";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { preferredLanguages } from "./../preferences";
import { languageItemList } from "./consts";
import { LanguageItem } from "./type";

export const maxLineLengthOfChineseTextDisplay = 45;
export const maxLineLengthOfEnglishTextDisplay = 95;

export function getLanguageItemFromYoudaoId(youdaoLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.youdaoId === youdaoLanguageId) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * Get youdao language id from tencent language id.
 */
export function getYoudaoLanguageIdFromTencentId(tencentLanguageId: string): string {
  for (const langItem of languageItemList) {
    const tencentDetectLanguageId = langItem.tencentDetectId || langItem.tencentId;
    if (tencentDetectLanguageId === tencentLanguageId) {
      return langItem.youdaoId;
    }
  }
  return languageItemList[0].youdaoId;
}

/**
 * Get tencent language id from youdao language id.
 */
export function getTencentLanguageId(youdaoLanguageId: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoId(youdaoLanguageId);
  return languageItem.tencentId;
}

/**
 * Get baidu language id from youdao language id.
 */
export function getBaiduLanguageId(youdaoLanguageId: string): string {
  const languageItem = getLanguageItemFromYoudaoId(youdaoLanguageId);
  return languageItem.baiduId;
}

/**
 * Get youdao language id from baidu language id.
 */
export function getYoudaoLanguageIdFromBaiduId(baiduLanguageId: string): string {
  for (const langItem of languageItemList) {
    if (langItem.baiduId === baiduLanguageId) {
      return langItem.youdaoId;
    }
  }
  return languageItemList[0].youdaoId;
}

/**
 * Get youdao language id from apple detect language id. this value is depend on the system language.
 *
 * Example: if system language is English, then the value is "English", if system language is Chinese, then the value is "中文".
 *
 * Todo: currently only support Chinese and English, later support other languages.
 */
export function getYoudaoLanguageIdFromAppleId(appleLanguageTitle: string): string {
  const francLanguage = francLangaugeDetect(appleLanguageTitle);
  const youdaoLanguageId = francLanguage.youdaoLanguageId;
  console.log(`---> getYoudaoLanguageIdFromAppleId: ${appleLanguageTitle}, franc detect youdaoId: ${youdaoLanguageId}`);

  const chineseLanguageItem = getLanguageItemFromAppleChineseTitle(appleLanguageTitle);
  if (chineseLanguageItem) {
    return chineseLanguageItem.youdaoId;
  }

  const englishLanguageItem = getLanguageItemFromAppleEnglishTitle(appleLanguageTitle);
  if (englishLanguageItem) {
    return englishLanguageItem.youdaoId;
  }

  return youdaoLanguageId;
}

/**
 * Get language item from apple Chinese title, such as "中文" --> LanguageItem
 *
 * * Note: There are two kinds of Chinese, 简体中文 and 繁体中文, but Apple only has one kind of 中文.
 */
export function getLanguageItemFromAppleChineseTitle(chineseTitle: string): LanguageItem | undefined {
  for (const langItem of languageItemList) {
    if (langItem.appleDetectChineseTitle.includes(chineseTitle)) {
      return langItem;
    }
  }
}

/**
 * Get language item from apple English title, such as "English" --> LanguageItem
 *
 * * Note: There are two kinds of Chinese, Chinese-Simplified and Chinese-Traditional, but Apple only has one kind of Chinese.
 */
export function getLanguageItemFromAppleEnglishTitle(englishTitle: string): LanguageItem | undefined {
  for (const langItem of languageItemList) {
    if (langItem.englishName.includes(englishTitle)) {
      return langItem;
    }
  }
}
/**
 * Get apple language id from youdao language id.
 */
export function getAppleLanguageId(youdaoLanguageId: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoId(youdaoLanguageId);
  return languageItem.appleId;
}

/**
 * Return language item from deepL language id, if not found, return auto language item
 */
export function getLanguageItemFromDeepLSourceId(deepLLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.deepLSourceId === deepLLanguageId) {
      return langItem;
    }
  }
  return languageItemList[0];
}
/**
 * Get deepL language id from youdao language id.
 */
export function getDeepLLanguageId(youdaoLanguageId: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoId(youdaoLanguageId);
  return languageItem.deepLSourceId;
}

/**
 * Get language title from youdao language id. eg. en -> English
 */
export function getLanguageTitle(youdaoLanguageId: string): string {
  const languageItem = getLanguageItemFromYoudaoId(youdaoLanguageId);
  return languageItem.englishName;
}

/**
 * Get caiyun language id from youdao language id.
 */
export function getCaiyunLanguageId(youdaoLanguageId: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoId(youdaoLanguageId);
  return languageItem.caiyunId;
}

/**
 * Get youdao language id from google language id.
 */
export function getYoudaoLanguageIdFromGoogleId(googleLanguageId: string): string {
  for (const langItem of languageItemList) {
    if (langItem.googleId === googleLanguageId) {
      return langItem.youdaoId;
    }
  }
  return languageItemList[0].youdaoId;
}

/**
 * Get google language id from youdao language id.
 */
export function getGoogleLanguageId(youdaoLanguageId: string): string {
  const languageItem = getLanguageItemFromYoudaoId(youdaoLanguageId);
  return languageItem.googleId;
}

/**
 * Get language item from franc language id
 */
export function getLanguageItemFromFrancId(francLanguageId: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.francId === francLanguageId) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * Check language id is valid, except 'auto', ''
 */
export function isValidLanguageId(languageId: string): boolean {
  if (languageId === "auto" || languageId.length === 0) {
    return false;
  }
  return true;
}

/**
 * Get eudic web dictionary url.
 *
 * https://dict.eudic.net/dicts/en/good
 */
export function getEudicWebDictionaryURL(queryTextInfo: QueryWordInfo): string | undefined {
  const languageId = getLanguageOfTwoExceptChinese([queryTextInfo.fromLanguage, queryTextInfo.toLanguage]);
  if (!languageId) {
    return;
  }

  const eudicDictionaryLanguages = ["en", "fr", "de", "es"]; // 英语，法语，德语，西班牙语
  if (eudicDictionaryLanguages.includes(languageId)) {
    const word = encodeURIComponent(queryTextInfo.word);
    return `https://dict.eudic.net/dicts/${languageId}/${word}`;
  }
}

/**
 * Get another language item expcept chinese from language item array.
 *
 * eg: [en, zh-CHS] --> en
 * eg: [zh-CHS, fr] --> fr
 */
export function getLanguageOfTwoExceptChinese(youdaoLanguageIds: [string, string]): string | undefined {
  if (youdaoLanguageIds.includes("zh-CHS")) {
    return youdaoLanguageIds[0] === "zh-CHS" ? youdaoLanguageIds[1] : youdaoLanguageIds[0];
  }
}

export function getGoogleWebTranslateURL(queryTextInfo: QueryWordInfo): string | undefined {
  const text = encodeURIComponent(queryTextInfo.word);
  const fromLanguageId = getGoogleLanguageId(queryTextInfo.fromLanguage);
  const toLanguageId = getGoogleLanguageId(queryTextInfo.toLanguage);
  const tld = queryTextInfo.tld || "cn";
  return `https://translate.google.${tld}/?sl=${fromLanguageId}&tl=${toLanguageId}&text=${text}&op=translate`;
}

/**
 * Get DeepL web translate url
 * https://www.deepl.com/translator#en/zh/look
 */
export function getDeepLWebTranslateURL(queryTextInfo: QueryWordInfo): string | undefined {
  const text = encodeURIComponent(queryTextInfo.word);

  const fromLanguageId = getDeepLLanguageId(queryTextInfo.fromLanguage);
  const toLanguageId = getDeepLLanguageId(queryTextInfo.toLanguage);
  if (fromLanguageId && toLanguageId) {
    return `https://www.deepl.com/translator#${fromLanguageId}/${toLanguageId}/${text}`;
  }
}

/**
 * Get Baidu web translate url.
 *
 * https://fanyi.baidu.com/#en/zh/good
 */
export function getBaiduWebTranslateURL(queryTextInfo: QueryWordInfo): string | undefined {
  const text = encodeURIComponent(queryTextInfo.word);
  const fromLanguageId = getBaiduLanguageId(queryTextInfo.fromLanguage);
  const toLanguageId = getBaiduLanguageId(queryTextInfo.toLanguage);
  if (fromLanguageId && toLanguageId) {
    return `https://fanyi.baidu.com/#${fromLanguageId}/${toLanguageId}/${text}`;
  }
}

/**
 * Get auto select target language according to the languageId.
 */
export function getAutoSelectedTargetLanguageItem(fromLanguageId: string): LanguageItem {
  const targetLanguageItem = preferredLanguages.find(
    (languageItem) => languageItem.youdaoId !== fromLanguageId
  ) as LanguageItem;
  console.log(`fromLanguageId: ${fromLanguageId}, auto selected target: ${targetLanguageItem.youdaoId}`);
  return targetLanguageItem;
}
