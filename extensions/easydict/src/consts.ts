import { LanguageItem, RequestErrorInfo } from "./types";

export const clipboardQueryTextKey = "clipboardQueryTextKey";

// 百度翻译：query 长度：为保证翻译质量，请将单次请求长度控制在 6000 bytes以内（汉字约为输入参数 2000 个）
export const maxInputTextLength = 2000;

export enum SectionType {
  Translation = "Translate",
  Explanations = "Explanation",
  Forms = "Forms and Tenses",
  WebTranslation = "Web Translation",
  WebPhrase = "Web Phrase",
}

export enum TranslateType {
  Youdao = "Youdao Translate",
  Baidu = "Baidu Translate",
  Tencent = "Tencent Translate",
  Caiyun = "Caiyun Translate",
}

export enum DicionaryType {
  Youdao = "Youdao Dictionary",
  Iciba = "Iciba Dictionary",
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

export const youdaoErrorCodeLink =
  "https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html#section-11";

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
      errorMessage: "",
    }
  );
}

export const languageItemList: LanguageItem[] = [
  {
    youdaoLanguageId: "auto",
    aliyunLanguageId: "auto",
    tencentLanguageId: "auto",
    baiduLanguageId: "auto",
    caiyunLanguageId: "auto",
    googleLanguageId: "auto",
    languageTitle: "Auto Language",
    languageVoice: ["Ting-Ting"],
  },
  {
    youdaoLanguageId: "zh-CHS",
    aliyunLanguageId: "zh",
    tencentLanguageId: "zh",
    baiduLanguageId: "zh",
    caiyunLanguageId: "zh",
    googleLanguageId: "zh-CN",
    languageTitle: "Chinese-Simplified",
    languageVoice: ["Ting-Ting"],
  },
  {
    youdaoLanguageId: "zh-CHT",
    aliyunLanguageId: "zh-tw",
    tencentLanguageId: "zh-TW",
    baiduLanguageId: "cht",
    caiyunLanguageId: "zh",
    googleLanguageId: "zh-TW",
    languageTitle: "Chinese-Traditional",
    languageVoice: ["Ting-Ting"],
  },
  {
    youdaoLanguageId: "en",
    aliyunLanguageId: "en",
    tencentLanguageId: "en",
    youdaoWebLanguageId: "eng",
    eudicWebLanguageId: "en",
    baiduLanguageId: "en",
    caiyunLanguageId: "en",
    googleLanguageId: "en",
    languageTitle: "English",
    languageVoice: ["Samantha", "Alex"],
  },
  {
    youdaoLanguageId: "ja",
    aliyunLanguageId: "ja",
    tencentDetectLanguageId: "jp",
    tencentLanguageId: "ja",
    youdaoWebLanguageId: "jap",
    baiduLanguageId: "jp",
    caiyunLanguageId: "ja",
    languageTitle: "Japanese",
    languageVoice: ["Kyoko"],
  },
  {
    youdaoLanguageId: "ko",
    aliyunLanguageId: "ko",
    tencentDetectLanguageId: "kr",
    tencentLanguageId: "ko",
    youdaoWebLanguageId: "ko",
    baiduLanguageId: "kor",
    languageTitle: "Korean",
    languageVoice: ["Yuna"],
  },
  {
    youdaoLanguageId: "fr",
    aliyunLanguageId: "fr",
    tencentLanguageId: "fr",
    youdaoWebLanguageId: "fr",
    eudicWebLanguageId: "fr",
    baiduLanguageId: "fra",
    languageTitle: "French",
    languageVoice: ["Amelie", "Thomas"],
  },
  {
    youdaoLanguageId: "es",
    aliyunLanguageId: "es",
    tencentLanguageId: "es",
    eudicWebLanguageId: "es",
    baiduLanguageId: "spa",
    languageTitle: "Spanish",
    languageVoice: ["Jorge", "Juan", "Diego", "Monica", "Paulina"],
  },
  {
    youdaoLanguageId: "it",
    aliyunLanguageId: "it",
    tencentLanguageId: "it",
    baiduLanguageId: "it",
    languageTitle: "Italian",
    languageVoice: ["Alice", "Luca"],
  },
  {
    youdaoLanguageId: "de",
    aliyunLanguageId: "de",
    tencentLanguageId: "de",
    eudicWebLanguageId: "de",
    baiduLanguageId: "de",
    languageTitle: "German",
    languageVoice: ["Anna"],
  },
  {
    youdaoLanguageId: "pt",
    aliyunLanguageId: "pt",
    tencentLanguageId: "pt",
    baiduLanguageId: "pt",
    languageTitle: "Portuguese",
    languageVoice: ["Joana", "Luciana"],
  },

  {
    youdaoLanguageId: "ru",
    aliyunLanguageId: "ru",
    tencentLanguageId: "ru",
    baiduLanguageId: "ru",
    languageTitle: "Russian",
    languageVoice: ["Milena", "Yuri"],
  },

  {
    youdaoLanguageId: "ar",
    aliyunLanguageId: "ar",
    tencentLanguageId: "ar",
    baiduLanguageId: "ara",
    languageTitle: "Arabic",
    languageVoice: ["Maged"],
  },
  {
    youdaoLanguageId: "th",
    aliyunLanguageId: "th",
    tencentLanguageId: "th",
    baiduLanguageId: "th",
    languageTitle: "Thai",
    languageVoice: ["Kanya"],
  },
  {
    youdaoLanguageId: "sv",
    aliyunLanguageId: "sv",
    baiduLanguageId: "swe",
    languageTitle: "Swedish",
    languageVoice: ["Alva"],
  },
  {
    youdaoLanguageId: "nl",
    aliyunLanguageId: "nl",
    baiduLanguageId: "nl",
    languageTitle: "Dutch",
    languageVoice: ["Ellen", "Xander"],
  },
  {
    youdaoLanguageId: "ro",
    aliyunLanguageId: "ro",
    baiduLanguageId: "rom",
    languageTitle: "Romanian",
    languageVoice: ["Ioana"],
  },
  {
    youdaoLanguageId: "sk",
    aliyunLanguageId: "sk",
    baiduLanguageId: "slo",
    languageTitle: "Slovak",
    languageVoice: ["Laura"],
  },
  {
    youdaoLanguageId: "hu",
    aliyunLanguageId: "hu",
    baiduLanguageId: "hu",
    languageTitle: "Hungarian",
    languageVoice: ["Mariska"],
  },
  {
    youdaoLanguageId: "el",
    aliyunLanguageId: "el",
    baiduLanguageId: "el",
    languageTitle: "Greek",
    languageVoice: ["Melina"],
  },
  {
    youdaoLanguageId: "da",
    aliyunLanguageId: "da",
    baiduLanguageId: "dan",
    languageTitle: "Danish",
    languageVoice: ["Sara"],
  },
  {
    youdaoLanguageId: "fi",
    aliyunLanguageId: "fi",
    baiduLanguageId: "fin",
    languageTitle: "Finnish",
    languageVoice: ["Satu"],
  },
  {
    youdaoLanguageId: "pl",
    aliyunLanguageId: "pl",
    baiduLanguageId: "pl",
    languageTitle: "Polish",
    languageVoice: ["Zosia"],
  },
  {
    youdaoLanguageId: "cs",
    aliyunLanguageId: "cs",
    baiduLanguageId: "cs",
    languageTitle: "Czech",
    languageVoice: ["Zuzana"],
  },
];
