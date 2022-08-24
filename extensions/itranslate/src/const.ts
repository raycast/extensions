export const LANG_LIST: ILangItem[] = [
  {
    langId: "zh-CN",
    deeplLangId: "ZH",
    youdaoLangId: "zh-CHS",
    baiduLangId: "zh",
    tencentLangId: "zh",
    langTitle: "Chinese-Simplified",
  },
  {
    langId: "en",
    deeplLangId: "EN",
    langTitle: "English",
  },
  {
    langId: "es",
    deeplLangId: "ES",
    baiduLangId: "spa",
    langTitle: "Spanish",
  },
  {
    langId: "hi",
    baiduLangId: "spa",
    langTitle: "Hindi",
  },
  {
    langId: "fr",
    deeplLangId: "FR",
    baiduLangId: "fra",
    langTitle: "French",
  },
  {
    langId: "ru",
    deeplLangId: "RU",
    langTitle: "Russian",
  },
  {
    langId: "pt",
    deeplLangId: "PT",
    langTitle: "Portuguese",
  },
  {
    langId: "id",
    langTitle: "Indonesian",
  },
  {
    langId: "ja",
    deeplLangId: "JA",
    baiduLangId: "jp",
    langTitle: "Japanese",
  },
  {
    langId: "ko",
    baiduLangId: "kor",
    langTitle: "Korean",
  },
  {
    langId: "th",
    langTitle: "Thai",
  },
  {
    langId: "vi",
    langTitle: "Vietnamese",
  },
];

export enum TransAPIErrCode {
  Success = "0",
  Fail = "-1",
  Retry = "-2",
  Loading = "-3",
}

export enum TransServiceProviderTp {
  Google = "google",
  GoogleCouldTrans = "google could translation",
  DeepL = "deepl",
  Youdao = "youdao",
  Baidu = "baidu",
  Tencent = "tencent",
}

export const TRANS_SERVICES_AUTH_NAMES = new Map<TransServiceProviderTp, string[]>([
  [TransServiceProviderTp.GoogleCouldTrans, ["Google Could Translation API Key"]],
  [TransServiceProviderTp.DeepL, ["Deepl Auth Key"]],
  [TransServiceProviderTp.Youdao, ["Youdao App ID", "Youdao App Secret"]],
  [TransServiceProviderTp.Baidu, ["Baidu App ID", "Baidu App Secret"]],
  [TransServiceProviderTp.Tencent, ["Tencent Secret ID", "Tencent Secret Key"]],
]);
