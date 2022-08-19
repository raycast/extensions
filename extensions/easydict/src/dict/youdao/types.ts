/*
 * @author: tisfeng
 * @createTime: 2022-08-04 23:21
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-19 13:05
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LanguageDetectTypeResult } from "../../detectLanauge/types";

export interface YoudaoDictionaryFormatResult {
  queryWordInfo: QueryWordInfo;
  translations: string[];
  explanations?: string[];
  forms?: YoudaoTranslateResultBasicFormsItem[];
  webTranslation?: TranslateResultKeyValueItem;
  webPhrases?: TranslateResultKeyValueItem[];
}

export enum YoudaoDictionaryListItemType {
  Translation = "Translate",
  Explanation = "Explanation",
  Forms = "Forms and Tenses",
  WebTranslation = "Web Translation",
  WebPhrase = "Web Phrase",
}

export interface YoudaoDictionaryResult {
  l: string;
  query: string;
  returnPhrase: [];
  errorCode: string;
  translation: string[]; // ! do not change property name! current only has one translation.
  web?: TranslateResultKeyValueItem[];
  basic?: YoudaoTranslateResultBasicItem;
  isWord: boolean;
  speakUrl: string;
}

export type YoudaoTranslateResult = YoudaoDictionaryResult;

export interface QueryWordInfo {
  word: string;
  fromLanguage: string; // ! must be Youdao language id.
  toLanguage: string;
  isWord?: boolean; // * Dictionary Type should has value, show web url need this value.
  hasDictionaryEntries?: boolean; // it is true if the word has dictionary entries.
  detectedLanguage?: LanguageDetectTypeResult;
  phonetic?: string; // ɡʊd
  examTypes?: string[];
  audioPath?: string;
  speechUrl?: string; // word audio url. some language not have tts url, such as "ຂາດ"
  tld?: string; // google tld
}

export interface YoudaoTranslateResultBasicItem {
  explains: string[];
  "us-phonetic"?: string; // American phonetic
  "us-speech"?: string;
  phonetic?: string; // Chinese word phonetic
  exam_type?: string[];
  wfs?: YoudaoTranslateResultBasicFormsItem[]; // word forms
}

export interface YoudaoTranslateResultBasicFormsItem {
  wf?: YoudaoTranslateResultBasicFormItem;
}

export interface YoudaoTranslateResultBasicFormItem {
  name: string;
  value: string;
}

export interface TranslateResultKeyValueItem {
  key: string;
  value: string[];
}
