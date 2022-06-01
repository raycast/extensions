import { LanguageItem, RequestErrorInfo } from "./types";

export enum SectionType {
  Translation = "Translate",
  Explanations = "Explanation",
  Forms = "Forms and Tenses",
  WebTranslation = "Web Translation",
  WebPhrase = "Web Phrase",
}

export enum TranslationType {
  Youdao = "Youdao Translate",
  Baidu = "Baidu Translate",
  Caiyun = "Caiyun Translate",
}

export enum YoudaoRequestStateCode {
  Success = "0",
  AccessFrequencyLimited = "207",
  InsufficientAccountBalance = "401",
  TargetLanguageNotSupported = "102",
}

// https://fanyi-api.baidu.com/doc/21
export enum BaiduRequestStateCode {
  Success = "52000",
  AccessFrequencyLimited = "54003",
  InsufficientAccountBalance = "54004",
  TargetLanguageNotSupported = "58001",
}

export const requestStateCodeLinkMap = new Map([
  [
    TranslationType.Youdao,
    "https://ai.youdao.com/DOCSIRMA/html/%E8%87%AA%E7%84%B6%E8%AF%AD%E8%A8%80%E7%BF%BB%E8%AF%91/API%E6%96%87%E6%A1%A3/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1/%E6%96%87%E6%9C%AC%E7%BF%BB%E8%AF%91%E6%9C%8D%E5%8A%A1-API%E6%96%87%E6%A1%A3.html#section-11",
  ],
  [TranslationType.Baidu, "https://fanyi-api.baidu.com/doc/21"],
]);

export const youdaoErrorList: RequestErrorInfo[] = [
  {
    errorCode: YoudaoRequestStateCode.Success,
    errorMessage: "Success",
  },
  {
    errorCode: YoudaoRequestStateCode.AccessFrequencyLimited,
    errorMessage: "Access frequency limited",
  },
  {
    errorCode: YoudaoRequestStateCode.InsufficientAccountBalance,
    errorMessage: "Insufficient account balance",
  },
  {
    errorCode: YoudaoRequestStateCode.TargetLanguageNotSupported,
    errorMessage: "Target language not supported",
  },
];

export function getYoudaoErrorInfo(errorCode: string): RequestErrorInfo {
  return (
    youdaoErrorList.find((item) => item.errorCode === errorCode) || {
      errorCode,
      errorMessage: "null",
    }
  );
}

export const languageItemList: LanguageItem[] = [
  {
    youdaoLanguageId: "auto",
    baiduLanguageId: "auto",
    caiyunLanguageId: "auto",
    googleLanguageId: "auto",
    languageTitle: "Auto Language",
    languageVoice: ["Ting-Ting"],
  },
  {
    youdaoLanguageId: "zh-CHS",
    baiduLanguageId: "zh",
    caiyunLanguageId: "zh",
    googleLanguageId: "zh-CN",
    languageTitle: "Chinese-Simplified",
    languageVoice: ["Ting-Ting"],
  },
  {
    youdaoLanguageId: "zh-CHT",
    baiduLanguageId: "cht",
    caiyunLanguageId: "zh",
    googleLanguageId: "zh-TW",
    languageTitle: "Chinese-Traditional",
    languageVoice: ["Ting-Ting"],
  },
  {
    youdaoLanguageId: "en",
    baiduLanguageId: "en",
    caiyunLanguageId: "en",
    googleLanguageId: "en",
    languageTitle: "English",
    languageVoice: [
      "Samantha",
      "Alex",
      "Fred",
      "Victoria",
      "Daniel",
      "Karen",
      "Moira",
      "Rishi",
      "Tessa",
      "Veena",
      "Fiona",
    ],
  },
  {
    youdaoLanguageId: "ja",
    baiduLanguageId: "jp",
    caiyunLanguageId: "ja",
    languageTitle: "Japanese",
    languageVoice: ["Kyoko"],
  },
  {
    youdaoLanguageId: "ko",
    baiduLanguageId: "kor",
    languageTitle: "Korean",
    languageVoice: ["Yuna"],
  },
  {
    youdaoLanguageId: "fr",
    baiduLanguageId: "fra",
    languageTitle: "French",
    languageVoice: ["Amelie", "Thomas"],
  },
  {
    youdaoLanguageId: "es",
    baiduLanguageId: "spa",
    languageTitle: "Spanish",
    languageVoice: ["Jorge", "Juan", "Diego", "Monica", "Paulina"],
  },
  {
    youdaoLanguageId: "pt",
    baiduLanguageId: "pt",
    languageTitle: "Portuguese",
    languageVoice: ["Joana", "Luciana"],
  },
  {
    youdaoLanguageId: "it",
    baiduLanguageId: "it",
    languageTitle: "Italian",
    languageVoice: ["Alice", "Luca"],
  },
  {
    youdaoLanguageId: "ru",
    baiduLanguageId: "ru",
    languageTitle: "Russian",
    languageVoice: ["Milena", "Yuri"],
  },
  {
    youdaoLanguageId: "de",
    baiduLanguageId: "de	",
    languageTitle: "German",
    languageVoice: ["Anna"],
  },
  {
    youdaoLanguageId: "ar",
    baiduLanguageId: "ara",
    languageTitle: "Arabic",
    languageVoice: ["Maged"],
  },
  {
    youdaoLanguageId: "sv",
    baiduLanguageId: "swe",
    languageTitle: "Swedish",
    languageVoice: ["Alva"],
  },
  {
    youdaoLanguageId: "nl",
    baiduLanguageId: "nl",
    languageTitle: "Dutch",
    languageVoice: ["Ellen", "Xander"],
  },
  {
    youdaoLanguageId: "ro",
    baiduLanguageId: "rom",
    languageTitle: "Romanian",
    languageVoice: ["Ioana"],
  },
  {
    youdaoLanguageId: "th",
    baiduLanguageId: "th",
    languageTitle: "Thai",
    languageVoice: ["Kanya"],
  },
  {
    youdaoLanguageId: "sk",
    baiduLanguageId: "slo",
    languageTitle: "Slovak",
    languageVoice: ["Laura"],
  },
  {
    youdaoLanguageId: "hu",
    baiduLanguageId: "hu",
    languageTitle: "Hungarian",
    languageVoice: ["Mariska"],
  },
  {
    youdaoLanguageId: "el",
    baiduLanguageId: "el",
    languageTitle: "Greek",
    languageVoice: ["Melina"],
  },
  {
    youdaoLanguageId: "da",
    baiduLanguageId: "dan",
    languageTitle: "Danish",
    languageVoice: ["Sara"],
  },
  {
    youdaoLanguageId: "fi",
    baiduLanguageId: "fin",
    languageTitle: "Finnish",
    languageVoice: ["Satu"],
  },
  {
    youdaoLanguageId: "pl",
    baiduLanguageId: "pl",
    languageTitle: "Polish",
    languageVoice: ["Zosia"],
  },
  {
    youdaoLanguageId: "cs",
    baiduLanguageId: "cs",
    languageTitle: "Czech",
    languageVoice: ["Zuzana"],
  },
];
