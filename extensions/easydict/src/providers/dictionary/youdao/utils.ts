/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { chineseLanguageItem } from "@/core/language/consts";
import { getLanguageOfTwoExceptChinese } from "@/core/language/utils";
import type { QueryInput } from "@/types/query";

/**
 * Get youdao web dictionary URL.
 *
 * new: https://youdao.com/result?word=good&lang=en
 * old: https://www.youdao.com/w/eng/good
 *
 * crawler parser: https://github.com/keenwon/eazydict-youdao/blob/master/lib/parser.js
 */
export function getYoudaoWebDictionaryURL(queryTextInfo: QueryInput): string | undefined {
  const languageId = getLanguageOfTwoExceptChinese([queryTextInfo.fromLanguage, queryTextInfo.toLanguage]);
  if (!languageId) {
    return;
  }

  const youdaoDictionaryLanguages = ["en", "fr", "ja", "ko"]; // 英语，法语，日语，韩语
  if (youdaoDictionaryLanguages.includes(languageId)) {
    const word = encodeURIComponent(queryTextInfo.word);
    return `https://youdao.com/result?word=${word}&lang=${languageId}`;
  }
}

/**
 * Get Youdao web dictionary query language according to fromLanguage.
 *
 * eg: en --> zh-CHS, return: en
 * eg: zh-CHS --> fr, return: fr
 */
export function getYoudaoWebDictionaryLanguageId(queryTextInfo: QueryInput): string | undefined {
  if (getYoudaoWebDictionaryURL(queryTextInfo) === undefined) {
    return;
  }

  const { fromLanguage, toLanguage } = queryTextInfo;
  let from = chineseLanguageItem.youdaoLangCode;
  let to = chineseLanguageItem.youdaoLangCode;
  if (fromLanguage === from) {
    to = toLanguage;
  } else {
    from = fromLanguage;
  }
  return getLanguageOfTwoExceptChinese([from, to]);
}
