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
    deeplLangId: "ID",
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
    deeplLangId: "DE",
    langTitle: "German",
    voice: "Anna",
  },
  {
    langId: "it",
    deeplLangId: "IT",
    langTitle: "Italian",
    voice: "Alice",
  },
  {
    langId: "bg",
    deeplLangId: "BG",
    langTitle: "Bulgarian",
  },
  {
    langId: "cs",
    deeplLangId: "CS",
    langTitle: "Czech",
    voice: "Zuzana",
  },
  {
    langId: "da",
    baiduLangId: "dan",
    deeplLangId: "DA",
    langTitle: "Danish",
    voice: "Sara",
  },
  {
    langId: "el",
    langTitle: "Greek",
    deeplLangId: "EL",
    voice: "Melina",
  },
  {
    langId: "et",
    baiduLangId: "est",
    deeplLangId: "ET",
    langTitle: "Estonian",
  },
  {
    langId: "fi",
    baiduLangId: "fin",
    deeplLangId: "FI",
    langTitle: "Finnish",
    voice: "Satu",
  },
  {
    langId: "hu",
    deeplLangId: "HU",
    langTitle: "Hungarian",
    voice: "Mariska",
  },
  {
    langId: "lt",
    baiduLangId: "lit",
    deeplLangId: "LT",
    langTitle: "Lithuanian",
  },
  {
    langId: "lv",
    baiduLangId: "lav",
    deeplLangId: "LV",
    langTitle: "Latvian",
  },
  {
    langId: "nl",
    deeplLangId: "NL",
    langTitle: "Dutch",
    voice: "Xander",
  },
  {
    langId: "pl",
    deeplLangId: "PL",
    langTitle: "Polish",
    voice: "Zosia",
  },
  {
    langId: "ro",
    baiduLangId: "roma",
    deeplLangId: "RO",
    langTitle: "Romanian",
    voice: "Ioana",
  },
  {
    langId: "sk",
    deeplLangId: "SK",
    langTitle: "Slovak",
    voice: "Laura",
  },
  {
    langId: "sl",
    baiduLangId: "slo",
    deeplLangId: "SL",
    langTitle: "Slovenian",
  },
  {
    langId: "sv",
    baiduLangId: "swe",
    deeplLangId: "SV",
    langTitle: "Swedish",
    voice: "Alva",
  },
  {
    langId: "tr",
    deeplLangId: "TR",
    langTitle: "Turkish",
    voice: "Yelda",
  },
  {
    langId: "uk",
    deeplLangId: "UK",
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
export const BaiduOCRTokenCacheKey = "$BaiduOCRTokenCacheKey$";

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

export const TempOCRImgName = "temp_itranslate_ocr_img.png";

export enum OCRServiceProviderTp {
  Space = "spaceOCR",
  Google = "googleOCR",
  MicrosoftAzure = "microsoftAzureOCR",
  Youdao = "youdaoOCR",
  Baidu = "baiduOCR",
  Tencent = "tencentOCR",
}

export const OCR_SERVICES_AUTH_NAMES = new Map<OCRServiceProviderTp, string[]>([
  [OCRServiceProviderTp.Google, ["Google Could Vision API Key"]],
  [
    OCRServiceProviderTp.MicrosoftAzure,
    ["Microsoft Azure Computer Vision Resource Name", "Microsoft Azure Cognitive Service API Key"],
  ],
  [OCRServiceProviderTp.Youdao, ["Youdao OCR App ID", "Youdao OCR App Secret"]],
  [OCRServiceProviderTp.Baidu, ["Baidu OCR API Key", "Baidu OCR Secret Key"]],
  [OCRServiceProviderTp.Tencent, ["Tencent OCR Secret ID", "Tencent OCR Secret Key"]],
]);

export const OCR_SERVICES_NAMES = new Map<OCRServiceProviderTp, string>([
  [OCRServiceProviderTp.Space, "OCRSpace"],
  [OCRServiceProviderTp.Google, "Google Could Vision"],
  [OCRServiceProviderTp.MicrosoftAzure, "Microsoft Azure Computer Vision"],
  [OCRServiceProviderTp.Youdao, "Youdao OCR"],
  [OCRServiceProviderTp.Baidu, "Baidu OCR"],
  [OCRServiceProviderTp.Tencent, "Tencent OCR"],
]);

export const OCR_SUPPORT_IMG_TYPE = [".png", ".jpg", ".jpeg"];

export const BUILD_IN_SPACE_OCR_API_KEY = "K87289516088957"; // Please be kind to it, please!
