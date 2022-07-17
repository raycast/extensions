/*
 * @author: tisfeng
 * @createTime: 2022-06-04 21:58
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-17 11:49
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { TextTranslateResponse } from "tencentcloud-sdk-nodejs-tmt/tencentcloud/services/tmt/v20180321/tmt_models";
import { LanguageDetectType } from "./detectLanguage";
import { IcibaDictionaryResult } from "./dict/iciba/interface";

export enum SectionType {
  Translation = "Translate",
  Explanations = "Explanation",
  Forms = "Forms and Tenses",
  WebTranslation = "Web Translation",
  WebPhrase = "Web Phrase",
}

export enum TranslateType {
  Youdao = "Youdao",
  Baidu = "Baidu",
  Tencent = "Tencent",
  Caiyun = "Caiyun",
  Apple = "Apple",
  DeepL = "DeepL",
}

export enum DicionaryType {
  Youdao = "Youdao Dictionary",
  Iciba = "Iciba Dictionary",
}

export interface RequestTypeResult {
  type: RequestType;
  result: RequestResult | null;
  errorInfo?: RequestErrorInfo;
}

type RequestResult =
  | YoudaoTranslateResult
  | BaiduTranslateResult
  | TencentTranslateResult
  | CaiyunTranslateResult
  | AppleTranslateResult
  | DeepLTranslateResult
  | IcibaDictionaryResult
  | YoudaoDictionaryResult;

export interface RequestErrorInfo {
  message: string;
  code?: string;
  type?: RequestType;
}

export type RequestType = TranslateType | DicionaryType | LanguageDetectType;

export interface YoudaoTranslateResult {
  l: string;
  query: string;
  returnPhrase: [];
  errorCode: string;
  translation: string[];
  web?: TranslateResultKeyValueItem[];
  basic?: YoudaoTranslateResultBasicItem;
  isWord: boolean;
  speakUrl: string;
}

export type YoudaoDictionaryResult = YoudaoTranslateResult;

export interface QueryWordInfo {
  word: string;
  fromLanguage: string;
  toLanguage: string;
  isWord?: boolean; // * NOTE: youdao return must be have value.
  phonetic?: string;
  speech?: string;
  examTypes?: string[];
  audioPath?: string;
  speechUrl?: string; // youdao tts url, some language not have tts url, such as "ຂາດ"
}

export interface YoudaoTranslateResultBasicItem {
  explains: string[];
  "us-phonetic"?: string; // American phonetic
  "us-speech"?: string;
  phonetic?: string; // Chinese word phonetic
  exam_type?: string[];
  wfs?: YoudaoTranslateResultBasicFormsItem[];
}
export interface YoudaoTranslateResultBasicFormsItem {
  wf?: YoudaoTranslateResultBasicFormItem;
}
export interface YoudaoTranslateResultBasicFormItem {
  name: string;
  value: string;
}

export interface YoudaoTranslateReformatResult {
  type: SectionType;
  children?: YoudaoTranslateReformatResultItem[];
}
export interface YoudaoTranslateReformatResultItem {
  key: string;
  title: string;
  copyText: string;
  subtitle?: string;
  phonetic?: string;
  speech?: string;
  examTypes?: string[];
}

export interface MyPreferences {
  language1: string;
  language2: string;
  isAutomaticQuerySelectedText: boolean;
  isAutomaticPlayWordAudio: boolean;
  isDisplayTargetTranslationLanguage: boolean;
  translationDisplayOrder: string;

  youdaoAppId: string;
  youdaoAppSecret: string;

  enableBaiduTranslate: boolean;
  baiduAppId: string;
  baiduAppSecret: string;

  enableTencentTranslate: boolean;
  tencentSecretId: string;
  tencentSecretKey: string;

  enableAppleLanguageDetect: boolean;
  enableAppleTranslate: boolean;

  enableDeepLTranslate: boolean;
  deepLAuthKey: string;

  enableCaiyunTranslate: boolean;
  caiyunToken: string;
}

export interface ActionListPanelProps {
  displayItem: TranslateDisplayItem;
  onLanguageUpdate: (language: LanguageItem) => void;
}

export interface LanguageItem {
  youdaoLanguageId: string;
  appleDetectChineseLanguageTitle?: string; // such as 中文，英语. ⚠️: Apple detect more languages than apple translate.
  appleLanguageId?: string; // used to translate, Apple translate support 12 languages?
  deepLSourceLanguageId?: string; // deepL source language id
  deepLTargetLanguageId?: string; // most are same as source language, some are different, such as "EN-GB" "EN-US" and so on.
  francLanguageId: string; // the languages represented by ISO 639-3
  aliyunLanguageId: string;
  tencentDetectLanguageId?: string; // tencent detect language id, [Japanese is "jp", Korean is "kr"] different from tencentLanguageId
  tencentLanguageId?: string;
  baiduLanguageId?: string;
  caiyunLanguageId?: string;
  languageTitle: string;
  voiceList?: string[];
  googleLanguageId?: string;
  youdaoWebLanguageId?: string;
  eudicWebLanguageId?: string;
}

export interface BaiduTranslateResult {
  from?: string;
  to?: string;
  trans_result?: BaiduTranslateItem[];
  error_code?: string;
  error_msg?: string;
}
export interface BaiduTranslateItem {
  src: string;
  dst: string;
}

export type TencentTranslateResult = TextTranslateResponse;

export interface CaiyunTranslateResult {
  rc: string;
  target: string[];
  confidence: number;
}

export interface AppleTranslateResult {
  translatedText: string;
}

/**
 * DeepL translate result
 */
export interface DeepLTranslateResult {
  translations: DeepLTranslationItem[];
}
export interface DeepLTranslationItem {
  detected_source_language: string;
  text: string;
}

export interface TranslateSourceResult {
  youdaoResult: YoudaoTranslateResult;
  baiduResult?: BaiduTranslateResult;
  tencentResult?: TencentTranslateResult;
  caiyunResult?: CaiyunTranslateResult;
  icibaResult?: IcibaDictionaryResult;
}

export interface TranslateFormatResult {
  queryWordInfo: QueryWordInfo;
  translationItems: TranslateItem[];
  explanations?: string[];
  forms?: YoudaoTranslateResultBasicFormsItem[];
  webTranslation?: TranslateResultKeyValueItem;
  webPhrases?: TranslateResultKeyValueItem[];
}

export interface TranslateItem {
  type: TranslateType;
  text: string;
}
export interface TranslateResultKeyValueItem {
  key: string;
  value: string[];
}

export interface TranslateDisplayResult {
  type: SectionType | TranslateType;
  sectionTitle?: SectionType | TranslateType | string;
  items?: TranslateDisplayItem[];
}
export interface TranslateDisplayItem {
  key: string;
  title: string;
  copyText: string;
  tooltip?: string;
  subtitle?: string;
  queryWordInfo: QueryWordInfo;
  phonetic?: string;
  speech?: string;
  examTypes?: string[];
  translationMarkdown?: string;
}

export interface ClipboardRecoredItem {
  key: string;
  vale: string;
}

export interface QueryRecoredItem {
  timestamp: number;
  queryText: string;
  result?: string;
}
