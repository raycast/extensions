export const LANG_LIST: ILangItem[] = [
  {
    langId: "zh-CN",
    deeplLangId: "ZH",
    youdaoLangId: "zh-CHS",
    baiduLangId: "zh",
    tencentLangId: "zh",
    aliyunLangId: "zh",
    microsoftLangId: "zh-Hans",
    langTitle: "Chinese-Simplified",
    voice: "Ting-Ting",
  },
  {
    langId: "en",
    deeplLangId: "EN",
    langTitle: "English",
    voice: "Alex",
  },
  {
    langId: "es",
    deeplLangId: "ES",
    baiduLangId: "spa",
    langTitle: "Spanish",
    voice: "Jorge",
  },
  {
    langId: "hi",
    baiduLangId: "spa",
    langTitle: "Hindi",
    voice: "Lekha",
  },
  {
    langId: "fr",
    deeplLangId: "FR",
    baiduLangId: "fra",
    langTitle: "French",
    voice: "Thomas",
  },
  {
    langId: "ru",
    deeplLangId: "RU",
    langTitle: "Russian",
    voice: "Yuri",
  },
  {
    langId: "pt",
    deeplLangId: "PT",
    microsoftLangId: "pt-pt",
    langTitle: "Portuguese",
    voice: "Joana",
  },
  {
    langId: "id",
    langTitle: "Indonesian",
    voice: "Damayanti",
  },
  {
    langId: "ja",
    deeplLangId: "JA",
    baiduLangId: "jp",
    langTitle: "Japanese",
    voice: "Kyoko",
  },
  {
    langId: "ko",
    baiduLangId: "kor",
    langTitle: "Korean",
    voice: "Yuna",
  },
  {
    langId: "th",
    langTitle: "Thai",
    voice: "Kanya",
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
  GoogleCouldTrans = "googleCouldTranslation",
  DeepL = "deepl",
  MicrosoftAzure = "microsoftAzure",
  Youdao = "youdao",
  Baidu = "baidu",
  Tencent = "tencent",
  Aliyun = "aliyun",
}

export const TRANS_SERVICES_AUTH_NAMES = new Map<TransServiceProviderTp, string[]>([
  [TransServiceProviderTp.GoogleCouldTrans, ["Google Could Translation API Key"]],
  [TransServiceProviderTp.DeepL, ["Deepl Auth Key"]],
  [TransServiceProviderTp.MicrosoftAzure, ["Microsoft Azure Access Key"]],
  [TransServiceProviderTp.Youdao, ["Youdao App ID", "Youdao App Secret"]],
  [TransServiceProviderTp.Baidu, ["Baidu App ID", "Baidu App Secret"]],
  [TransServiceProviderTp.Tencent, ["Tencent Secret ID", "Tencent Secret Key"]],
  [TransServiceProviderTp.Aliyun, ["Aliyun Access Key ID", "Aliyun Access Key Secret"]],
]);

export enum GoogleFreeAPITLD {
  Com = "com",
  Cn = "cn",
}

export const HistoriesCacheKey = "$HistoriesCacheKey$";

export const TRANS_SERVICES_NAMES = new Map<TransServiceProviderTp, string>([
  [TransServiceProviderTp.Google, "Google(Free)"],
  [TransServiceProviderTp.GoogleCouldTrans, "Google Could Translation"],
  [TransServiceProviderTp.DeepL, "Deepl"],
  [TransServiceProviderTp.MicrosoftAzure, "Microsoft Azure"],
  [TransServiceProviderTp.Youdao, "Youdao"],
  [TransServiceProviderTp.Baidu, "Baidu"],
  [TransServiceProviderTp.Tencent, "Tencent"],
  [TransServiceProviderTp.Aliyun, "Aliyun"],
]);
