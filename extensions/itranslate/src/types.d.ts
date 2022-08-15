interface IPreferences {
  langFirst: string;
  langSecond: string;
  defaultServiceProvider: TransServiceProviderTp;
  deeplAuthKey: string;
  deeplApiPro: boolean;
  disableDeepL: boolean;
  youdaoAppId: string;
  youdaoAppKey: string;
  disableYoudao: boolean;
  baiduAppId: string;
  baiduAppKey: string;
  disableBaidu: boolean;
  tencentAppId: string;
  tencentAppKey: string;
  disableTencent: boolean;
  selectedDefault: boolean;
  quickSwitchLang: boolean;
  delayTransInterval: number;
}

interface ILangItem {
  langId: string;
  deeplLangId?: string;
  baiduLangId?: string;
  tencentLangId?: string;
  youdaoLangId?: string;
  langTitle: string;
}

interface ITranslateRes {
  serviceProvider: TransServiceProviderTp;
  code: TransAPIErrCode;
  from: ILangItem;
  to: ILangItem;
  origin: string;
  res: string;
  start?: number;
  end?: number;
  fromPhonetic?: string;
  targetExplains?: string[];
  derivatives?: DerivativeItem[];
  isWord?: boolean;
  phonetic?: string;
}

interface DerivativeItem {
  key: string;
  value: string[];
}

interface ITransServiceProvider {
  appId: string;
  appKey: string;
  serviceProvider: TransServiceProviderTp;
}

interface IGoogleTranslateResult {
  text: string;
  from: {
    language: {
      iso: string;
    };
  };
}

interface IDeepLTranslateResult {
  translations: IDeepLTranslateItem[];
}

interface IDeepLTranslateItem {
  detected_source_language: string;
  text: string;
}

interface IYouDaoTranslateResult {
  l: string;
  query: string;
  returnPhrase: [];
  errorCode: string;
  translation: string[];
  web?: DerivativeItem[];
  basic?: ITranslateResultBasicItem;
  isWord: boolean;
}

interface ITranslateResultBasicItem {
  explains: string[];
  phonetic?: string;
}

interface IBaiduTranslateResult {
  from: string;
  to: string;
  errorCode: string;
  trans_result: IBaiduTranslateItem[];
  dict: string;
}

interface IBaiduTranslateItem {
  src: string;
  dst: string;
}

interface ITencentTranslateResult {
  Response: ITencentTranslateResponse;
}

interface ITencentTranslateResponse {
  Source: string;
  Target: string;
  TargetText: string;
  Error: {
    Code: string;
  };
}
