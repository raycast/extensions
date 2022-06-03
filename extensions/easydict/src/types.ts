import { SectionType, TranslationType } from "./consts";

export interface YoudaoTranslateResult {
  l: string;
  query: string;
  returnPhrase: [];
  errorCode: string;
  translation: string[];
  web?: TranslateResultKeyValueItem[];
  basic?: YoudaoTranslateResultBasicItem;
  isWord: boolean;
}
export interface YoudaoTranslateResultBasicItem {
  explains: string[];
  phonetic?: string;
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
  examTypes?: string[];
}

export interface MyPreferences {
  language1: string;
  language2: string;
  youdaoAppId: string;
  youdaoAppSecret: string;
  baiduAppId: string;
  baiduAppSecret: string;
  caiyunAppToken: string;
  isAutomaticQueryClipboard: boolean;
  isDisplayTargetTranslationLanguage: boolean;
}

export interface ListItemActionPanelItem {
  isInstalledEudic: boolean;
  isShowOpenInEudicWeb: boolean;
  eudicWebUrl: string;
  isShowOpenInYoudaoWeb: boolean;
  youdaoWebUrl: string;
  copyText?: string;
  queryText?: string;
  currentFromLanguage?: LanguageItem;
  currentTargetLanguage?: LanguageItem;
  onLanguageUpdate: (language: LanguageItem) => void;
}

export interface RequestResultState {
  type: TranslationType;
  errorInfo: RequestErrorInfo;
}

export interface RequestErrorInfo {
  errorCode: string;
  errorMessage: string;
}

export interface LanguageItem {
  youdaoLanguageId: string;
  youdaoWebLanguageId?: string;
  eudicWebLanguageId?: string;
  baiduLanguageId?: string;
  caiyunLanguageId?: string;
  languageTitle: string;
  languageVoice: string[];
  googleLanguageId?: string;
}

export interface BaiduTranslateResult {
  from: string;
  to: string;
  trans_result: BaiduTranslateItem[];
}
export interface BaiduTranslateItem {
  src: string;
  dst: string;
}

export interface CaiyunTranslateResult {
  rc: string;
  target: string;
  confidence: number;
}

export interface TranslateSourceResult {
  youdaoResult: YoudaoTranslateResult;
  baiduResult: BaiduTranslateResult;
  caiyunResult?: CaiyunTranslateResult;
}

export interface TranslateReformatResult {
  queryTextInfo: QueryTextInfo;
  translations: TranslationItem[];
  explanations?: string[];
  forms?: YoudaoTranslateResultBasicFormsItem[];
  webTranslation?: TranslateResultKeyValueItem;
  webPhrases?: TranslateResultKeyValueItem[];
}

export interface QueryTextInfo {
  query: string;
  phonetic?: string;
  from: string;
  to: string;
  isWord: boolean;
  examTypes?: string[];
}
export interface TranslationItem {
  type: TranslationType;
  text: string;
}
export interface TranslateResultKeyValueItem {
  key: string;
  value: string[];
}

export interface TranslateDisplayResult {
  type: SectionType | TranslationType;
  sectionTitle?: SectionType | TranslationType | string;
  items?: TranslateDisplayItem[];
}
export interface TranslateDisplayItem {
  key: string;
  title: string;
  copyText: string;
  tooltip?: string;
  subtitle?: string;
  phonetic?: string;
  examTypes?: string[];
  translationType?: TranslationType;
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
