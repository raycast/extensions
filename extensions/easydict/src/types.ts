/*
 * @author: tisfeng
 * @createTime: 2022-06-04 21:58
 * @lastEditor: tisfeng
 * @lastEditTime: 2023-03-16 18:32
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { Image } from "@raycast/api";
import { RawResponse } from "@vitalets/google-translate-api/dist/cjs/types";
import { ChildProcess } from "child_process";
import { TextTranslateResponse } from "tencentcloud-sdk-nodejs-tmt/tencentcloud/services/tmt/v20180321/tmt_models";
import { LanguageDetectType } from "./detectLanguage/types";
import { IcibaDictionaryResult } from "./dictionary/iciba/interface";
import { LingueeDictionaryResult, LingueeListItemType } from "./dictionary/linguee/types";
import { YoudaoTranslateResponse } from "./dictionary/youdao/translate.type";
import {
  QueryWordInfo,
  YoudaoDictionaryFormatResult,
  YoudaoDictionaryListItemType,
  YoudaoWebTranslateResult,
} from "./dictionary/youdao/types";
import { LanguageItem } from "./language/type";
import { BingTranslateResult } from "./translation/microsoft/types";
import { VolcanoDetectResult, VolcanoTranslateResult } from "./translation/volcano/types";

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
  Bing = "Bing Translate",
  Volcano = "Volcano Translate",
  OpenAI = "OpenAI Translate",
}

export enum DictionaryType {
  Youdao = "Youdao Dictionary",
  Iciba = "Iciba Dictionary",
  Eudic = "Eudic Dictionary",
  Linguee = "Linguee Dictionary",
}

export type QueryType = TranslationType | DictionaryType;
export type RequestType = TranslationType | DictionaryType | LanguageDetectType;

export interface QueryTypeResult {
  type: QueryType;
  queryWordInfo: QueryWordInfo; // dictionary type must has own word info.
  result?: QueryResponse; // when language is not supported, result is undefined.
  translations: string[]; // each translation is a paragraph.
  oneLineTranslation?: string; // one line translation. will automatically give value when updating if type is TranslationType.
  errorInfo?: RequestErrorInfo;

  onMessage?: (message: { content: string; role: string }) => void;
  onError?: (error: string) => void;
  onFinish?: (reason: string) => void;
}

export type QueryResponse =
  | YoudaoDictionaryFormatResult
  | YoudaoWebTranslateResult
  | BingTranslateResult
  | BaiduTranslateResult
  | BaiduWebLanguageDetect
  | TencentTranslateResult
  | CaiyunTranslateResult
  | DeepLTranslateResult
  | IcibaDictionaryResult
  | LingueeDictionaryResult
  | AppleTranslateResult
  | VolcanoTranslateResult
  | VolcanoDetectResult
  | GoogleTranslateResult
  | OpenAITranslateResult
  | YoudaoTranslateResponse;

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

export interface BaiduWebLanguageDetect {
  error?: number; // 0
  msg?: string; // "success"
  lan?: string; // "en"
}

export interface TencentTranslateResult extends TextTranslateResponse {
  Error: TencentError;
}

// {"Code":"InvalidParameterValue","Message":"不支持的语种：ar_to_zh"}
export interface TencentError {
  Code: string;
  Message: string;
}

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

export type GoogleTranslateResult = {
  text: string;
  raw: RawResponse;
};

export interface AppleTranslateResult {
  translatedText: string;
}

export interface OpenAITranslateResult {
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
  hideDisplay?: boolean; // this value comes from preferences. if true, set displaySections to null.
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
  subtitle?: string;
  displayType: ListItemDisplayType; // LingueeListItemType.Example
  queryType: QueryType; // LingueeListItemType
  copyText: string;
  tooltip?: string;
  speech?: string;
  detailsMarkdown?: string;
  sourceData?: QueryResponse;

  // accessory item
  accessoryItem?: ListAccessoryItem;
}

export interface ListAccessoryItem {
  phonetic?: string;
  examTypes?: string[];
  example?: string; // French word example text
}

export type ListItemDisplayType = LingueeListItemType | YoudaoDictionaryListItemType | QueryType;

export interface ClipboardRecordedItem {
  key: string;
  value: string;
}

export interface QueryRecordedItem {
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
export type { QueryWordInfo };
