import { TextTranslateResponse } from "tencentcloud-sdk-nodejs-tmt/tencentcloud/services/tmt/v20180321/tmt_models";
import { DicionaryType, SectionType, TranslateType } from "./consts";
import { IcibaDictionaryResult } from "./dict/iciba/interface";

export interface TranslateTypeResult {
  type: TranslateType | DicionaryType;
  result:
    | YoudaoTranslateResult
    | BaiduTranslateResult
    | TencentTranslateResult
    | CaiyunTranslateResult
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
  phonetic?: string;
  speech?: string;
  fromLanguage: string;
  toLanguage: string;
  isWord: boolean;
  examTypes?: string[];
  audioPath?: string;
  speechUrl: string; // youdao tts url
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
}

export interface ListItemActionPanelItem {
  isInstalledEudic: boolean;
  isShowOpenInEudicWeb: boolean;
  eudicWebUrl: string;
  isShowOpenInYoudaoWeb: boolean;
  youdaoWebUrl: string;
  copyText: string;
  queryText: string;
  queryWordInfo: QueryWordInfo;
  currentFromLanguage: LanguageItem;
  currentTargetLanguage: LanguageItem;
  onLanguageUpdate: (language: LanguageItem) => void;
}

export interface RequestErrorInfo {
  errorCode: string;
  errorMessage: string;
}

export interface LanguageItem {
  youdaoLanguageId: string;
  aliyunLanguageId: string;
  tencentDetectLanguageId?: string; // tencent detect language id, [Japanese is "jp", Korean is "kr"] different from tencentLanguageId
  tencentLanguageId?: string;
  baiduLanguageId?: string;
  caiyunLanguageId?: string;
  languageTitle: string;
  languageVoice: string[];
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

// export interface TencentTranslateResult {
//   TargetText: string;
//   Source: string;
//   Target: string;
//   RequestId: string;
// }

export interface CaiyunTranslateResult {
  rc: string;
  target: string[];
  confidence: number;
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
