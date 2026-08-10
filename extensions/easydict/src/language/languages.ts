/*
 * @author: tisfeng
 * @createTime: 2022-08-05 10:54
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-10-17 18:12
 * @fileName: languages.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { francLanguageDetect } from "../detectLanguage/franc";
import { QueryWordInfo } from "../dictionary/youdao/types";
import { preferredLanguages } from "../preferences";
import { languageItemList } from "./consts";
import { LanguageItem } from "./type";

export const maxLineLengthOfChineseTextDisplay = 45;
export const maxLineLengthOfEnglishTextDisplay = 90;

export function getLanguageItemFromYoudaoCode(youdaoLangCode: string): LanguageItem {
  for (const langItem of languageItemList) {
    if (langItem.youdaoLangCode === youdaoLangCode) {
      return langItem;
    }
  }
  return languageItemList[0];
}

/**
 * Get Bing language code from youdao language code.
 */
export function getBingLangCode(youdaoLangCode: string): string {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.bingLangCode;
}
/**
 * Get youdao language code from Bing language code.
 */
export function getYoudaoLangCodeFromBingCode(bingLangCode: string): string {
  const bingLanguageItem = languageItemList.find((langItem) => langItem.bingLangCode === bingLangCode);
  if (bingLanguageItem) {
    return bingLanguageItem.youdaoLangCode;
  }

  return languageItemList[0].youdaoLangCode;
}

/**
 * Get Volcano language code from youdao language code.
 */
export function getVolcanoLangCode(youdaoLangCode: string): string {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.volcanoLangCode;
}

/**
 * Get Youdao language code from Volcano language code.
 */
export function getYoudaoLangCodeFromVolcanoCode(volcanoLangCode: string): string {
  const volcanoLanguageItem = languageItemList.find((langItem) => langItem.volcanoLangCode === volcanoLangCode);
  if (volcanoLanguageItem) {
    return volcanoLanguageItem.youdaoLangCode;
  }

  return languageItemList[0].youdaoLangCode;
}

/**
 * Get youdao language code from tencent language code.
 */
export function getYoudaoLangCodeFromTencentCode(tencentLangCode: string): string {
  for (const langItem of languageItemList) {
    const tencentDetectLangCode = langItem.tencentDetectCode || langItem.tencentLangCode;
    if (tencentDetectLangCode === tencentLangCode) {
      return langItem.youdaoLangCode;
    }
  }
  return languageItemList[0].youdaoLangCode;
}

/**
 * Get tencent language code from youdao language code.
 */
export function getTencentLangCode(youdaoLangCode: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.tencentLangCode;
}

/**
 * Get baidu language code from youdao language code.
 */
export function getBaiduLangCode(youdaoLangCode: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.baiduLangCode;
}

/**
 * Get youdao languagec ode from baidu language code.
 */
export function getYoudaoLangCodeFromBaiduCode(baiduLangCode: string): string {
  for (const langItem of languageItemList) {
    if (langItem.baiduLangCode === baiduLangCode) {
      return langItem.youdaoLangCode;
    }
  }
  return languageItemList[0].youdaoLangCode;
}

/**
 * Get youdao language code from apple detect language code. this value is depend on the system language.
 *
 * Example: if system language is English, then the value is "English", if system language is Chinese, then the value is "中文".
 *
 * Todo: currently only support Chinese and English, later support other languages.
 */
export function getYoudaoLangCodeFromAppleCode(appleLanguageTitle: string): string {
  const francLanguage = francLanguageDetect(appleLanguageTitle);
  const youdaoLangCode = francLanguage.youdaoLangCode;
  console.log(`getYoudaoLangCodeFromAppleCode: ${appleLanguageTitle}, franc detect YoudaoLangCode: ${youdaoLangCode}`);

  const chineseLanguageItem = getLanguageItemFromAppleChineseTitle(appleLanguageTitle);
  if (chineseLanguageItem) {
    return chineseLanguageItem.youdaoLangCode;
  }

  const englishLanguageItem = getLanguageItemFromAppleEnglishTitle(appleLanguageTitle);
  if (englishLanguageItem) {
    return englishLanguageItem.youdaoLangCode;
  }

  return youdaoLangCode;
}

/**
 * Get language item from apple Chinese title, such as "中文" --> LanguageItem
 *
 * * Note: There are two kinds of Chinese, 简体中文 and 繁体中文，but Apple only has one kind of 中文。
 */
export function getLanguageItemFromAppleChineseTitle(chineseTitle: string): LanguageItem | undefined {
  for (const langItem of languageItemList) {
    if (langItem.appleDetectLangChineseName?.includes(chineseTitle)) {
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
    if (langItem.langEnglishName.includes(englishTitle)) {
      return langItem;
    }
  }
}
/**
 * Get apple languagecodefrom youdao language code.
 */
export function getAppleLangCode(youdaoLangCode: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.appleLangCode;
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
 * Get deepL languagecodefrom youdao language code.
 */
export function getDeepLLangCode(youdaoLangCode: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.deepLSourceId;
}

/**
 * Get language title from youdao language code. eg. en -> English
 */
export function getLanguageEnglishName(youdaoLangCode: string): string {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.langEnglishName;
}

/**
 * Get caiyun languagecodefrom youdao language code.
 */
export function getCaiyunLangCode(youdaoLangCode: string): string | undefined {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.caiyunLangCode;
}

/**
 * Get youdao languagecodefrom google language code.
 */
export function getYoudaoLangCodeFromGoogleCode(googleLangCode: string): string {
  for (const langItem of languageItemList) {
    if (langItem.googleLangCode === googleLangCode) {
      return langItem.youdaoLangCode;
    }
  }
  return languageItemList[0].youdaoLangCode;
}

/**
 * Get google languagecodefrom youdao language code.
 */
export function getGoogleLangCode(youdaoLangCode: string): string {
  const languageItem = getLanguageItemFromYoudaoCode(youdaoLangCode);
  return languageItem.googleLangCode;
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
 * Check languagecodeis valid, except 'auto', ''
 */
export function isValidLangCode(LangCode: string): boolean {
  if (LangCode === "auto" || LangCode.length === 0) {
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
  const LangCode = getLanguageOfTwoExceptChinese([queryTextInfo.fromLanguage, queryTextInfo.toLanguage]);
  if (!LangCode) {
    return;
  }

  const eudicDictionaryLanguages = ["en", "fr", "de", "es"]; // 英语，法语，德语，西班牙语
  if (eudicDictionaryLanguages.includes(LangCode)) {
    const word = encodeURIComponent(queryTextInfo.word);
    return `https://dict.eudic.net/dicts/${LangCode}/${word}`;
  }
}

/**
 * Get another language item expcept chinese from language item array.
 *
 * eg: [en, zh-CHS] --> en
 * eg: [zh-CHS, fr] --> fr
 */
export function getLanguageOfTwoExceptChinese(youdaoLangCodes: [string, string]): string | undefined {
  if (youdaoLangCodes.includes("zh-CHS")) {
    return youdaoLangCodes[0] === "zh-CHS" ? youdaoLangCodes[1] : youdaoLangCodes[0];
  }
}

export function getGoogleWebTranslateURL(queryTextInfo: QueryWordInfo): string {
  const text = encodeURIComponent(queryTextInfo.word);
  const fromLangCode = getGoogleLangCode(queryTextInfo.fromLanguage);
  const toLangCode = getGoogleLangCode(queryTextInfo.toLanguage);
  return `https://translate.google.com/?sl=${fromLangCode}&tl=${toLangCode}&text=${text}&op=translate`;
}

/**
 * Get DeepL web translate url
 * https://www.deepl.com/translator#en/zh/look
 */
export function getDeepLWebTranslateURL(queryTextInfo: QueryWordInfo): string | undefined {
  const text = encodeURIComponent(queryTextInfo.word);

  const fromLangCode = getDeepLLangCode(queryTextInfo.fromLanguage)?.toLowerCase();
  const toLangCode = getDeepLLangCode(queryTextInfo.toLanguage)?.toLowerCase();
  if (fromLangCode && toLangCode) {
    return `https://www.deepl.com/translator#${fromLangCode}/${toLangCode}/${text}`;
  }
}

/**
 * Get Baidu web translate url.
 *
 * https://fanyi.baidu.com/#en/zh/good
 */
export function getBaiduWebTranslateURL(queryTextInfo: QueryWordInfo): string | undefined {
  const text = encodeURIComponent(queryTextInfo.word);
  const fromLangCode = getBaiduLangCode(queryTextInfo.fromLanguage);
  const toLangCode = getBaiduLangCode(queryTextInfo.toLanguage);
  if (fromLangCode && toLangCode) {
    return `https://fanyi.baidu.com/#${fromLangCode}/${toLangCode}/${text}`;
  }
}

/**
 * Get auto select target language according to the LangCode.
 */
export function getAutoSelectedTargetLanguageItem(fromLangCode: string): LanguageItem {
  const targetLanguageItem = preferredLanguages.find(
    (languageItem) => languageItem.youdaoLangCode !== fromLangCode,
  ) as LanguageItem;
  console.log(`fromLangCode: ${fromLangCode}, auto selected target: ${targetLanguageItem.youdaoLangCode}`);
  return targetLanguageItem;
}
