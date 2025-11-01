/*
 * @author: tisfeng
 * @createTime: 2022-08-12 18:37
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-25 22:56
 * @fileName: utils.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { preferredLanguages } from "../preferences";
import { englishLanguageItem } from "../language/consts";

/**
 * check if the language is preferred language
 */
export function isPreferredLanguage(languageId: string): boolean {
  return preferredLanguages.map((item) => item.youdaoLangCode).includes(languageId);
}

/**
 * check if preferred languages contains English language
 */
export function checkIfPreferredLanguagesContainEnglish(): boolean {
  return preferredLanguages.find((item) => item.youdaoLangCode === englishLanguageItem.youdaoLangCode) !== undefined;
}

/**
 * check if preferred languages contains Chinese language
 */
export function checkIfPreferredLanguagesContainChinese(): boolean {
  const lanuguageIdPrefix = "zh";
  return preferredLanguages.find((item) => item.youdaoLangCode.startsWith(lanuguageIdPrefix)) !== undefined;
}

/**
 * return remove all punctuation from the text
 */
export function removeEnglishPunctuation(text: string) {
  return text.replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-./:;<=>?@[\]^_`{|}~·]/g, "");
}

/**
 * return remove all Chinese punctuation and blank space from the text
 */
export function removeChinesePunctuation(text: string) {
  return text.replace(
    /[\u3002\uff1f\uff01\uff0c\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09\u300a\u300b\u3008\u3009\u3010\u3011\u300e\u300f\u300c\u300d\ufe43\ufe44\u3014\u3015\u2026\u2014\uff5e\ufe4f\uffe5]/g,
    "",
  );
}

/**
 * return remove remove all punctuation from the text
 */
export function removePunctuation(text: string) {
  return removeEnglishPunctuation(removeChinesePunctuation(text));
}

/**
 * return remove all blank space from the text
 */
export function removeBlankSpace(text: string) {
  return text.replace(/\s/g, "");
}

/**
 * check if the text contains Chinese characters
 */
export function isContainChinese(text: string) {
  return /[\u4e00-\u9fa5]/g.test(text);
}

/**
 * check text is chinese
 */
export function isChinese(text: string) {
  return /^[\u4e00-\u9fa5]+$/.test(text);
}

/**
 * check if text isEnglish or isNumber
 */
export function isEnglishOrNumber(text: string) {
  const pureText = removePunctuation(removeBlankSpace(text));
  console.log("pureText: " + pureText);
  return /^[a-zA-Z0-9]+$/.test(pureText);
}
