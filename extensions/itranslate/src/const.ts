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
  {
    langId: "ar",
    baiduLangId: "ara",
    langTitle: "Arabic",
    voice: "Maged",
  },
  {
    langId: "de",
    langTitle: "German",
    voice: "Anna",
  },
  {
    langId: "it",
    langTitle: "Italian",
    voice: "Alice",
  },
  {
    langId: "bg",
    langTitle: "Bulgarian",
  },
  {
    langId: "cs",
    langTitle: "Czech",
    voice: "Zuzana",
  },
  {
    langId: "da",
    baiduLangId: "dan",
    langTitle: "Danish",
    voice: "Sara",
  },
  {
    langId: "el",
    langTitle: "Greek",
    voice: "Melina",
  },
  {
    langId: "et",
    baiduLangId: "est",
    langTitle: "Estonian",
  },
  {
    langId: "fi",
    baiduLangId: "fin",
    langTitle: "Finnish",
    voice: "Satu",
  },
  {
    langId: "hu",
    langTitle: "Hungarian",
    voice: "Mariska",
  },
  {
    langId: "lt",
    baiduLangId: "lit",
    langTitle: "Lithuanian",
  },
  {
    langId: "lv",
    baiduLangId: "lav",
    langTitle: "Latvian",
  },
  {
    langId: "nl",
    langTitle: "Dutch",
    voice: "Xander",
  },
  {
    langId: "pl",
    langTitle: "Polish",
    voice: "Zosia",
  },
  {
    langId: "ro",
    baiduLangId: "roma",
    langTitle: "Romanian",
    voice: "Ioana",
  },
  {
    langId: "sk",
    langTitle: "Slovak",
    voice: "Laura",
  },
  {
    langId: "sl",
    baiduLangId: "slo",
    langTitle: "Slovenian",
  },
  {
    langId: "sv",
    baiduLangId: "swe",
    langTitle: "Swedish",
    voice: "Alva",
  },
  {
    langId: "tr",
    langTitle: "Turkish",
    voice: "Yelda",
  },
  {
    langId: "uk",
    langTitle: "Ukrainian",
  },
  {
    langId: "no",
    langTitle: "Norwegian",
    voice: "Nora",
  },
  {
    langId: "fa",
    langTitle: "Persian",
  },
  {
    langId: "sr",
    microsoftLangId: "sr-Cyrl",
    youdaoLangId: "sr-Cyrl",
    langTitle: "Serbian (Cyrillic)",
  },
  {
    langId: "cy",
    langTitle: "Welsh",
  },
];

export enum TransAPIErrCode {
  Success = "0",
  Fail = "-1",
  Retry = "-2",
  Loading = "-3",
  NotSupport = "-4",
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

export const TRANS_SERVICES_NOT_SUPPORT_LANGS = new Map<TransServiceProviderTp, string[]>([
  [TransServiceProviderTp.Google, []],
  [TransServiceProviderTp.GoogleCouldTrans, []],
  [TransServiceProviderTp.DeepL, ["ar", "hi", "ko", "th", "vi", "no", "fa", "sr", "cy"]],
  [TransServiceProviderTp.MicrosoftAzure, []],
  [TransServiceProviderTp.Youdao, []],
  [TransServiceProviderTp.Baidu, ["tr", "uk", "no", "fa", "sr", "cy"]],
  [
    TransServiceProviderTp.Tencent,
    [
      "bg",
      "cs",
      "da",
      "el",
      "et",
      "fi",
      "hu",
      "lt",
      "lv",
      "nl",
      "pl",
      "ro",
      "sk",
      "sl",
      "sv",
      "uk",
      "no",
      "fa",
      "sr",
      "cy",
    ],
  ],
  [TransServiceProviderTp.Aliyun, ["uk", "sr"]],
]);
