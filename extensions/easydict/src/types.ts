/*
 * @author: tisfeng
 * @createTime: 2022-06-04 21:58
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-20 11:13
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Image } from "@raycast/api";
import googleTranslateApi from "@vitalets/google-translate-api";
import { ChildProcess } from "child_process";
import { TextTranslateResponse } from "tencentcloud-sdk-nodejs-tmt/tencentcloud/services/tmt/v20180321/tmt_models";
import { LanguageDetectType } from "./detectLanauge/types";
import { IcibaDictionaryResult } from "./dictionary/iciba/interface";
import { LingueeDictionaryResult, LingueeListItemType } from "./dictionary/linguee/types";
import { QueryWordInfo, YoudaoDictionaryFormatResult, YoudaoDictionaryListItemType } from "./dictionary/youdao/types";
import { LanguageItem } from "./language/type";

export interface ActionListPanelProps {
  displayItem: ListDisplayItem;
  isInstalledEudic: boolean;
  isShowingReleasePrompt: boolean;
  onLanguageUpdate: (language: LanguageItem) => void;
}

export enum TranslationType {
  Youdao = "Youdao Translate",
  Baidu = "Baidu Translate",
  Tencent = "Tencent Translate",
  Caiyun = "Caiyun Translate",
  Apple = "Apple Translate",
  DeepL = "DeepL Translate",
  Google = "Google Translate",
}

export enum DicionaryType {
  Youdao = "Youdao Dictionary",
  Iciba = "Iciba Dictionary",
  Eudic = "Eudic Dictionary",
  Linguee = "Linguee Dictionary",
}

export type QueryType = TranslationType | DicionaryType;
export type RequestType = TranslationType | DicionaryType | LanguageDetectType;

export interface QueryTypeResult {
  type: QueryType;
  wordInfo: QueryWordInfo; // dictionary type must has own word info.
  result?: QueryResponse; // when language is not supported, result is undefined.
  translations: string[]; // each translation is a paragraph.
  oneLineTranslation?: string; // one line translation. will automatically give value when updating if type is TranslationType.
  errorInfo?: RequestErrorInfo;
}

export type QueryResponse =
  | YoudaoDictionaryFormatResult
  | BaiduTranslateResult
  | TencentTranslateResult
  | CaiyunTranslateResult
  | DeepLTranslateResult
  | IcibaDictionaryResult
  | LingueeDictionaryResult
  | AppleTranslateResult
  | GoogleTranslateResult;

export interface RequestErrorInfo {
  type: RequestType;
  message: string;
  code?: string;
}

export interface BaiduTranslateResult {
  from?: string;
  to?: string;
  trans_result?: BaiduTranslateItem[];
  error_code?: string; // has value when error happens
  error_msg?: string;
}
export interface BaiduTranslateItem {
  src: string;
  dst: string;
}

export type TencentTranslateResult = TextTranslateResponse;

// export interface TencentTranslateResult {
//   Response: TencentTranslateResponse;
// }
// export type TencentTranslateResponse = TextTranslateResponse;

export interface CaiyunTranslateResult {
  rc: string;
  target: string[];
  confidence: number;
}

export interface DeepLTranslateResult {
  translations: DeepLTranslationItem[]; //  deepL may return multiple translations for the text.
}
export interface DeepLTranslationItem {
  detected_source_language: string;
  text: string;
}

export type GoogleTranslateResult = googleTranslateApi.ITranslateResponse;

export interface AppleTranslateResult {
  translatedText: string;
}

export interface TranslationItem {
  type: TranslationType;
  text: string;
}

export interface QueryResult {
  type: QueryType;
  sourceResult: QueryTypeResult;
  displaySections?: DisplaySection[]; // if sourceResult.result is not null, displaySections is not null.
  disableDisplay?: boolean; // this value comes from preferences. if true, set displaySections to null.
}

export interface DisplaySection {
  type: ListItemDisplayType;
  sectionTitle?: string;
  items: ListDisplayItem[];
}

export interface ListDisplayItem {
  queryWordInfo: QueryWordInfo;
  key: string;
  title: string;
  displayType: ListItemDisplayType; // LingueeListItemType.Example
  queryType: QueryType; // LingueeListItemType
  copyText: string;
  tooltip?: string;
  subtitle?: string;
  speech?: string;
  translationMarkdown?: string;

  // accessory item
  accessoryItem?: ListAccessoryItem;
}

export interface ListAccessoryItem {
  phonetic?: string;
  examTypes?: string[];
  example?: string; // French word example text
}

export type ListItemDisplayType = LingueeListItemType | YoudaoDictionaryListItemType | QueryType;

export interface ClipboardRecoredItem {
  key: string;
  value: string;
}

export interface QueryRecoredItem {
  timestamp: number;
  queryText: string;
  result?: string;
}

export interface WebQueryItem {
  type: QueryType;
  webUrl: string;
  icon: Image.ImageLike;
  title: string;
}

export interface AbortObject {
  abortController?: AbortController;
  childProcess?: ChildProcess;
}
