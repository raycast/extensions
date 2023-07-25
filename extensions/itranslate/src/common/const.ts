export const LANG_LIST: ILangItem[] = [
  {
    langId: "zh-Hans",
    googleLangId: "zh-CN",
    deeplLangId: "ZH",
    youdaoLangId: "zh-CHS",
    baiduLangId: "zh",
    tencentLangId: "zh",
    aliyunLangId: "zh",
    langTitle: "Chinese-Simplified",
  },
  {
    langId: "zh-Hant",
    googleLangId: "zh-TW",
    youdaoLangId: "zh-CHT",
    baiduLangId: "cht",
    tencentLangId: "zh-TW",
    aliyunLangId: "zh-tw",
    langTitle: "Chinese-Traditional",
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
    microsoftLangId: "pt-pt",
    langTitle: "Portuguese",
  },
  {
    langId: "id",
    deeplLangId: "ID",
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
  {
    langId: "ar",
    baiduLangId: "ara",
    langTitle: "Arabic",
  },
  {
    langId: "de",
    deeplLangId: "DE",
    langTitle: "German",
  },
  {
    langId: "it",
    deeplLangId: "IT",
    langTitle: "Italian",
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
  },
  {
    langId: "da",
    baiduLangId: "dan",
    deeplLangId: "DA",
    langTitle: "Danish",
  },
  {
    langId: "el",
    langTitle: "Greek",
    deeplLangId: "EL",
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
  },
  {
    langId: "hu",
    deeplLangId: "HU",
    langTitle: "Hungarian",
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
  },
  {
    langId: "pl",
    deeplLangId: "PL",
    langTitle: "Polish",
  },
  {
    langId: "ro",
    baiduLangId: "roma",
    deeplLangId: "RO",
    langTitle: "Romanian",
  },
  {
    langId: "sk",
    deeplLangId: "SK",
    langTitle: "Slovak",
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
  },
  {
    langId: "tr",
    deeplLangId: "TR",
    langTitle: "Turkish",
  },
  {
    langId: "uk",
    deeplLangId: "UK",
    langTitle: "Ukrainian",
  },
  {
    langId: "no",
    langTitle: "Norwegian",
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
export const VoiceCachePerfixKey = "$VoiceCachePerfixKey$";

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
  [TransServiceProviderTp.DeepL, ["ar", "hi", "ko", "th", "vi", "no", "fa", "sr", "cy", "zh-Hant"]],
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
