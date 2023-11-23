/*
 * @author: tisfeng
 * @createTime: 2022-08-31 11:07
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-31 13:24
 * @fileName: utils.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { chineseLanguageItem } from "../../language/consts";
import { getLanguageOfTwoExceptChinese } from "../../language/languages";
import { QueryWordInfo } from "./types";

/**
 * Get youdao web dictionary URL.
 *
 * new: https://youdao.com/result?word=good&lang=en
 * old: https://www.youdao.com/w/eng/good
 *
 * crawler parser: https://github.com/keenwon/eazydict-youdao/blob/master/lib/parser.js
 */
export function getYoudaoWebDictionaryURL(queryTextInfo: QueryWordInfo): string | undefined {
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
export function getYoudaoWebDictionaryLanguageId(queryTextInfo: QueryWordInfo): string | undefined {
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

/**
 * Check is valid Youdao web translate language.
 *
 * See: https://fanyi.youdao.com/
 */
export function isValidYoudaoWebTranslateLanguage(queryTextInfo: QueryWordInfo): boolean {
  const { fromLanguage, toLanguage } = queryTextInfo;
  const targetLanguage = getLanguageOfTwoExceptChinese([fromLanguage, toLanguage]);
  if (!targetLanguage) {
    return false;
  }

  // * Note: Youdao web translate only support Chinese <--> validLanguages
  const validLanguages = ["en", "ja", "ko", "fr", "de", "ru", "es", "it", "ar", "nl", "th"];
  return validLanguages.includes(targetLanguage);
}
