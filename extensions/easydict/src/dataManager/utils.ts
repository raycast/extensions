/*
 * @author: tisfeng
 * @createTime: 2022-08-17 17:41
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-18 16:51
 * @fileName: utils.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { hasLingueeDictionaryEntries } from "../dict/linguee/parse";
import { LingueeDictionaryResult } from "../dict/linguee/types";
import { hasYoudaoDictionaryEntries } from "../dict/youdao/formatData";
import { YoudaoDictionaryFormatResult } from "../dict/youdao/types";
import {
  getLanguageItemFromYoudaoId,
  maxLineLengthOfChineseTextDisplay,
  maxLineLengthOfEnglishTextDisplay,
} from "../language/languages";
import { myPreferences } from "../preferences";
import { DicionaryType, QueryTypeResult, TranslationItem, TranslationType } from "../types";
import { QueryResult } from "../types";

/**
 * Get services sort order. If user set the order manually, prioritize the order.
 *
 * * Note: currently only can manually sort transaltion order.
 *
 * @return [linguee dictionary, youdao dictionary, deepl...], all lowercase.
 */
export function getSortOrder(): string[] {
  const defaultDictionaryOrder = [DicionaryType.Linguee, DicionaryType.Youdao];
  const defaultTranslationOrder = [
    TranslationType.DeepL,
    TranslationType.Google,
    TranslationType.Apple,
    TranslationType.Baidu,
    TranslationType.Tencent,
    TranslationType.Youdao,
    TranslationType.Caiyun,
  ];

  const defaultTranslations = defaultTranslationOrder.map((type) => type.toString().toLowerCase());

  const userOrder: string[] = [];
  // * NOTE: user manually set the sort order may not be complete, or even tpye wrong name.
  const manualOrder = myPreferences.translationOrder.split(","); // "Baidu,DeepL,Tencent"
  // console.log("---> manualOrder:", manualOrder);
  if (manualOrder.length > 0) {
    for (let translationName of manualOrder) {
      translationName = `${translationName.trim()} Translate`.toLowerCase();
      // if the type name is in the default order, add it to user order, and remove it from defaultNameOrder.
      if (defaultTranslations.includes(translationName)) {
        userOrder.push(translationName);
        defaultTranslations.splice(defaultTranslations.indexOf(translationName), 1);
      }
    }
  }

  const finalOrder = [...defaultDictionaryOrder, ...userOrder, ...defaultTranslations].map((title) =>
    title.toLowerCase()
  );
  // console.log("defaultNameOrder:", defaultTranslations);
  // console.log("userOrder:", userOrder);
  // console.log("finalOrder:", finalOrder);
  return finalOrder;
}

/**
 * Determine whether the title of the result exceeds the maximum value of one line.
 */
export function isTranslationTooLong(translation: string, toLanguage: string): boolean {
  const isChineseTextResult = toLanguage === "zh-CHS";
  const isEnglishTextResult = toLanguage === "en";
  let isTooLong = false;
  const textLength = translation.length;
  if (isChineseTextResult) {
    if (textLength > maxLineLengthOfChineseTextDisplay) {
      isTooLong = true;
    }
  } else if (isEnglishTextResult) {
    if (textLength > maxLineLengthOfEnglishTextDisplay) {
      isTooLong = true;
    }
  } else if (textLength > maxLineLengthOfEnglishTextDisplay) {
    isTooLong = true;
  }
  //   console.log(`---> check is too long: ${isTooLong}, length: ${translation.length}`);
  return isTooLong;
}

/**
 * Check if show translation detail.
 *
 * Iterate QueryResult, if dictionary is not empty, and translation is too long, show translation detail.
 */
export function checkIfShowTranslationDetail(queryResults: QueryResult[]): boolean {
  let isShowDetail = false;
  for (const queryResult of queryResults) {
    const wordInfo = queryResult.sourceResult.wordInfo;
    const isDictionaryType = Object.values(DicionaryType).includes(queryResult.type as DicionaryType);
    if (isDictionaryType) {
      if (wordInfo.hasDictionaryEntries) {
        isShowDetail = false;
        break;
      }
    } else {
      // check if translation is too long
      const oneLineTranslation = queryResult.sourceResult?.oneLineTranslation || "";
      const isTooLong = isTranslationTooLong(oneLineTranslation, wordInfo.toLanguage);
      if (isTooLong) {
        isShowDetail = true;
        break;
      }
    }
  }
  // console.log(`---> isShowDetail: ${isShowDetail}`);
  return isShowDetail;
}

/**
 * Check if dictionary has entries.
 */
export function checkIfDictionaryHasEntries(dictionaryResult: QueryResult): boolean {
  const { type: dictionaryType } = dictionaryResult;
  const isDictionaryType = Object.values(DicionaryType).includes(dictionaryType as DicionaryType);
  if (!isDictionaryType) {
    return false;
  }

  const sourceResult = dictionaryResult.sourceResult;

  let hasEntries = false;
  switch (dictionaryType) {
    case DicionaryType.Linguee: {
      hasEntries = hasLingueeDictionaryEntries(sourceResult.result as LingueeDictionaryResult);
      break;
    }
    case DicionaryType.Youdao: {
      hasEntries = hasYoudaoDictionaryEntries(sourceResult.result as YoudaoDictionaryFormatResult);
      break;
    }
  }
  return hasEntries;
}

/**
 * Get fromTo language title according from and to language id.  eg. zh-CHS --> en, return: Chinese-Simplified🇨🇳 --> English🇬🇧
 *
 * * Since language title is too long for detail page, so we use short emoji instead.  eg. zh-CHS --> en, return: 🇨🇳 --> 🇬🇧
 */
export function getFromToLanguageTitle(from: string, to: string, onlyEmoji = false) {
  const fromLanguageItem = getLanguageItemFromYoudaoId(from);
  const toLanguageItem = getLanguageItemFromYoudaoId(to);
  const fromToEmoji = `${fromLanguageItem.emoji} --> ${toLanguageItem.emoji}`;
  const fromToLanguageNameAndEmoji = `${fromLanguageItem.englishName}${fromLanguageItem.emoji} --> ${toLanguageItem.englishName}${toLanguageItem.emoji}`;
  return onlyEmoji ? fromToEmoji : fromToLanguageNameAndEmoji;
}

/**
 * Format translation to markdown.
 */
export function formatTranslationToMarkdown(sourceResult: QueryTypeResult) {
  const { type, translations, wordInfo } = sourceResult;
  const oneLineTranslation = translations.join("\n");
  if (oneLineTranslation.trim().length === 0) {
    return "";
  }

  const string = oneLineTranslation.replace(/\n/g, "\n\n");
  const fromTo = getFromToLanguageTitle(wordInfo.fromLanguage, wordInfo.toLanguage, true);

  const markdown = `
  ## ${type}   (${fromTo})
  ---  
  ${string}
  `;
  return markdown;
}

/**
 * Update translation markdown.
 */
export function updateTranslationMarkdown(queryResult: QueryResult, queryResults: QueryResult[]) {
  const { sourceResult, displaySections } = queryResult;
  if (!sourceResult || !displaySections?.length) {
    return;
  }

  const translations = [] as TranslationItem[];
  for (const queryResult of queryResults) {
    const { type, sourceResult } = queryResult;
    const isTranslationType = Object.values(TranslationType).includes(type as TranslationType);
    if (sourceResult && isTranslationType) {
      const type = sourceResult.type as TranslationType;
      const markdownTranslation = formatTranslationToMarkdown(sourceResult);
      translations.push({ type: type, text: markdownTranslation });
    }
  }
  // Traverse the translations array. If the type of translation element is equal to it, move it to the first of the array.
  for (let i = 0; i < translations.length; i++) {
    if (translations[i].type === queryResult.type) {
      const temp = translations[i];
      translations.splice(i, 1);
      translations.unshift(temp);
      break;
    }
  }
  const markdown = translations.map((translation) => translation.text).join("\n");
  // console.log(`---> type: ${queryResult.type},  markdown: ${markdown}`);

  const listDiplayItem = displaySections[0].items;
  if (listDiplayItem?.length) {
    listDiplayItem[0].translationMarkdown = markdown;
  }
}

/**
 * Sort query results by designated order.
 *
 * * NOTE: this function will be called many times, because request results are async, so we need to sort every time.
 */
export function sortedQueryResults(queryResults: QueryResult[]) {
  const sortedQueryResults: QueryResult[] = [];
  for (const queryResult of queryResults) {
    const typeString = queryResult.type.toString().toLowerCase();
    const index = getSortOrder().indexOf(typeString);
    sortedQueryResults[index] = queryResult;
    // console.log(`---> sort results: index: ${index}, ${queryResult.type}`);
  }
  // filter undefined, or result is undefined.
  return sortedQueryResults.filter((queryResult) => {
    if (queryResult?.sourceResult.result) {
      return true;
    }
  });
}
