/*
 * @author: tisfeng
 * @createTime: 2022-06-04 21:58
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-03 20:02
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { TextTranslateResponse } from "tencentcloud-sdk-nodejs-tmt/tencentcloud/services/tmt/v20180321/tmt_models";
import { RequestType, SectionType, TranslateType } from "./consts";
import { IcibaDictionaryResult } from "./dict/iciba/interface";

export interface TranslateTypeResult {
  type: RequestType;
  result:
    | YoudaoTranslateResult
    | BaiduTranslateResult
    | TencentTranslateResult
    | CaiyunTranslateResult
    | AppleTranslateResult
    | IcibaDictionaryResult
    | YoudaoDictionaryResult
    | null;
  errorInfo?: RequestErrorInfo;
}

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
  youdaoAppId: string;
  youdaoAppSecret: string;
  baiduAppId: string;
  baiduAppSecret: string;
  caiyunToken: string;
  tencentSecretId: string;
  tencentSecretKey: string;
  tencentProjectId: string;
  isAutomaticQuerySelectedText: boolean;
  isAutomaticPlayWordAudio: boolean;
  isDisplayTargetTranslationLanguage: boolean;
  enableBaiduTranslate: boolean;
  enableTencentTranslate: boolean;
  enableCaiyunTranslate: boolean;
  enableAppleLanguageDetect: boolean;
  enableAppleTranslate: boolean;
}

export interface ActionListPanelProps {
  displayItem: TranslateDisplayItem;
  onLanguageUpdate: (language: LanguageItem) => void;
}

export interface RequestErrorInfo {
  message: string;
  code?: string;
  type?: RequestType;
}

export interface LanguageItem {
  youdaoLanguageId: string;
  appleLanguageId?: string; // apple language id, apple translate support 12 languages
  appleChineseLanguageTitle?: string; // apple Chinese language title, 中文，英语
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

export interface TranslateSourceResult {
  youdaoResult: YoudaoTranslateResult;
  baiduResult?: BaiduTranslateResult;
  tencentResult?: TencentTranslateResult;
  caiyunResult?: CaiyunTranslateResult;
  icibaResult?: IcibaDictionaryResult;
}

export interface TranslateFormatResult {
  queryWordInfo: QueryWordInfo;
  translations: TranslateItem[];
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
