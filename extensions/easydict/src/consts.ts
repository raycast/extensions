/*
 * @author: tisfeng
 * @createTime: 2022-06-24 22:36
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-07-17 11:54
 * @fileName: consts.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { LanguageItem, RequestErrorInfo } from "./types";

export const clipboardQueryTextKey = "clipboardQueryTextKey";

export enum YoudaoRequestStateCode {
  Success = "0",
  AccessFrequencyLimited = "207",
  InsufficientAccountBalance = "401",
  TargetLanguageNotSupported = "102",
  TranslationQueryFailed = "302", // 翻译查询失败, such as 'con' 😓
}

// https://fanyi-api.baidu.com/doc/21
export enum BaiduRequestStateCode {
  Success = "52000",
  AccessFrequencyLimited = "54003",
  InsufficientAccountBalance = "54004",
  TargetLanguageNotSupported = "58001",
}

export const youdaoErrorCodeUrl = encodeURI(
  "https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html#section-11"
);

export const youdaoErrorList: RequestErrorInfo[] = [
  {
    code: YoudaoRequestStateCode.Success,
    message: "Success",
  },
  {
    code: YoudaoRequestStateCode.AccessFrequencyLimited,
    message: "Access frequency limited",
  },
  {
    code: YoudaoRequestStateCode.InsufficientAccountBalance,
    message: "Insufficient account balance",
  },
  {
    code: YoudaoRequestStateCode.TargetLanguageNotSupported,
    message: "Target language not supported",
  },
  {
    code: YoudaoRequestStateCode.TranslationQueryFailed,
    message: "Translation query failed",
  },
];

export function getYoudaoErrorInfo(errorCode: string): RequestErrorInfo {
  return (
    youdaoErrorList.find((item) => item.code === errorCode) || {
      code: errorCode,
      message: "",
    }
  );
}

/**
 * Language item list.
 * Currently support 22 languages, includes two Chinese languages.
 * TODO: add more translation supported languages.
 * TODO: add more apple detect supported languages.
 */
export const languageItemList: LanguageItem[] = [
  {
    youdaoLanguageId: "auto",
    appleLanguageId: "auto",
    francLanguageId: "und", // 'und', means undetermined
    aliyunLanguageId: "auto",
    tencentLanguageId: "auto",
    baiduLanguageId: "auto",
    caiyunLanguageId: "auto",
    googleLanguageId: "auto",
    languageTitle: "Auto Language",
  },
  {
    youdaoLanguageId: "zh-CHS",
    appleLanguageId: "zh_CN",
    appleDetectChineseLanguageTitle: "中文",
    deepLSourceLanguageId: "ZH",
    francLanguageId: "cmn",
    aliyunLanguageId: "zh",
    tencentLanguageId: "zh",
    baiduLanguageId: "zh",
    caiyunLanguageId: "zh",
    googleLanguageId: "zh-CN",
    languageTitle: "Chinese-Simplified",
    voiceList: ["Ting-Ting"],
  },
  {
    youdaoLanguageId: "zh-CHT",
    appleLanguageId: "zh-TW",
    appleDetectChineseLanguageTitle: "中文",
    francLanguageId: "cmn",
    aliyunLanguageId: "zh-tw",
    tencentLanguageId: "zh-TW",
    baiduLanguageId: "cht",
    googleLanguageId: "zh-TW",
    languageTitle: "Chinese-Traditional",
    voiceList: ["Ting-Ting"],
  },
  {
    youdaoLanguageId: "en",
    appleLanguageId: "en_US",
    appleDetectChineseLanguageTitle: "英语",
    deepLSourceLanguageId: "EN",
    deepLTargetLanguageId: "EN-US", // "EN-GB" "EN-US"
    francLanguageId: "eng",
    aliyunLanguageId: "en",
    tencentLanguageId: "en",
    youdaoWebLanguageId: "eng",
    eudicWebLanguageId: "en",
    baiduLanguageId: "en",
    caiyunLanguageId: "en",
    googleLanguageId: "en",
    languageTitle: "English",
    voiceList: ["Alex", "Samantha"],
  },
  {
    youdaoLanguageId: "ja",
    appleLanguageId: "ja_JP",
    appleDetectChineseLanguageTitle: "日语",
    deepLSourceLanguageId: "JA",
    francLanguageId: "jpn",
    aliyunLanguageId: "ja",
    tencentDetectLanguageId: "jp",
    tencentLanguageId: "ja",
    youdaoWebLanguageId: "jap",
    baiduLanguageId: "jp",
    caiyunLanguageId: "ja",
    languageTitle: "Japanese",
    voiceList: ["Kyoko"],
  },
  {
    youdaoLanguageId: "ko",
    appleLanguageId: "ko_KR",
    appleDetectChineseLanguageTitle: "韩语",
    francLanguageId: "kor",
    aliyunLanguageId: "ko",
    tencentDetectLanguageId: "kr",
    tencentLanguageId: "ko",
    youdaoWebLanguageId: "ko",
    baiduLanguageId: "kor",
    languageTitle: "Korean",
    voiceList: ["Yuna"],
  },
  {
    youdaoLanguageId: "fr",
    appleLanguageId: "fr_FR",
    appleDetectChineseLanguageTitle: "法语",
    deepLSourceLanguageId: "FR",
    francLanguageId: "fra",
    aliyunLanguageId: "fr",
    tencentLanguageId: "fr",
    youdaoWebLanguageId: "fr",
    eudicWebLanguageId: "fr",
    baiduLanguageId: "fra",
    languageTitle: "French",
    voiceList: ["Amelie", "Thomas"],
  },
  {
    youdaoLanguageId: "es",
    appleLanguageId: "es_ES",
    appleDetectChineseLanguageTitle: "西班牙语",
    deepLSourceLanguageId: "ES",
    francLanguageId: "spa",
    aliyunLanguageId: "es",
    tencentLanguageId: "es",
    eudicWebLanguageId: "es",
    baiduLanguageId: "spa",
    languageTitle: "Spanish",
    voiceList: ["Jorge", "Juan", "Diego", "Monica", "Paulina"],
  },
  {
    youdaoLanguageId: "pt",
    appleLanguageId: "pt_BR",
    appleDetectChineseLanguageTitle: "葡萄牙语",
    deepLSourceLanguageId: "PT",
    deepLTargetLanguageId: "PT-PT", // "PT-PT" "PT-BR"
    francLanguageId: "por",
    aliyunLanguageId: "pt",
    tencentLanguageId: "pt",
    baiduLanguageId: "pt",
    languageTitle: "Portuguese",
    voiceList: ["Joana", "Luciana"],
  },
  {
    youdaoLanguageId: "it",
    appleLanguageId: "it_IT",
    appleDetectChineseLanguageTitle: "意大利语",
    deepLSourceLanguageId: "IT",
    francLanguageId: "ita",
    aliyunLanguageId: "it",
    tencentLanguageId: "it",
    baiduLanguageId: "it",
    languageTitle: "Italian",
    voiceList: ["Alice", "Luca"],
  },
  {
    youdaoLanguageId: "de",
    appleLanguageId: "de_DE",
    appleDetectChineseLanguageTitle: "德语",
    deepLSourceLanguageId: "DE",
    francLanguageId: "deu",
    aliyunLanguageId: "de",
    tencentLanguageId: "de",
    eudicWebLanguageId: "de",
    baiduLanguageId: "de",
    languageTitle: "German",
    voiceList: ["Anna"],
  },
  {
    youdaoLanguageId: "ru",
    appleLanguageId: "ru_RU",
    appleDetectChineseLanguageTitle: "俄语",
    deepLSourceLanguageId: "RU",
    francLanguageId: "rus",
    aliyunLanguageId: "ru",
    tencentLanguageId: "ru",
    baiduLanguageId: "ru",
    languageTitle: "Russian",
    voiceList: ["Milena", "Yuri"],
  },
  {
    youdaoLanguageId: "ar",
    appleLanguageId: "ar_AE",
    appleDetectChineseLanguageTitle: "阿拉伯语",
    francLanguageId: "arb",
    aliyunLanguageId: "ar",
    tencentLanguageId: "ar",
    baiduLanguageId: "ara",
    languageTitle: "Arabic",
    voiceList: ["Maged"],
  },
  {
    youdaoLanguageId: "sv",
    appleDetectChineseLanguageTitle: "瑞典语",
    deepLSourceLanguageId: "SV",
    francLanguageId: "swe",
    aliyunLanguageId: "sv",
    baiduLanguageId: "swe",
    languageTitle: "Swedish",
    voiceList: ["Alva"],
  },
  {
    youdaoLanguageId: "ro",
    appleDetectChineseLanguageTitle: "罗马尼亚语",
    deepLSourceLanguageId: "RO",
    francLanguageId: "ron",
    aliyunLanguageId: "ro",
    baiduLanguageId: "rom",
    languageTitle: "Romanian",
    voiceList: ["Ioana"],
  },
  {
    youdaoLanguageId: "th",
    appleDetectChineseLanguageTitle: "泰语",
    francLanguageId: "tha",
    aliyunLanguageId: "th",
    tencentLanguageId: "th",
    baiduLanguageId: "th",
    languageTitle: "Thai",
    voiceList: ["Kanya"],
  },
  {
    youdaoLanguageId: "sk",
    appleDetectChineseLanguageTitle: "斯洛伐克语",
    deepLSourceLanguageId: "SK",
    francLanguageId: "slk",
    aliyunLanguageId: "sk",
    baiduLanguageId: "slo",
    languageTitle: "Slovak",
    voiceList: ["Laura"],
  },
  {
    youdaoLanguageId: "nl",
    appleDetectChineseLanguageTitle: "荷兰语",
    deepLSourceLanguageId: "NL",
    francLanguageId: "nld",
    aliyunLanguageId: "nl",
    baiduLanguageId: "nl",
    languageTitle: "Dutch",
    voiceList: ["Ellen", "Xander"],
  },
  {
    youdaoLanguageId: "hu",
    appleDetectChineseLanguageTitle: "匈牙利语",
    deepLSourceLanguageId: "HU",
    francLanguageId: "hun",
    aliyunLanguageId: "hu",
    baiduLanguageId: "hu",
    languageTitle: "Hungarian",
    voiceList: ["Mariska"],
  },
  {
    youdaoLanguageId: "el",
    appleDetectChineseLanguageTitle: "希腊语",
    deepLSourceLanguageId: "EL",
    francLanguageId: "ell",
    aliyunLanguageId: "el",
    baiduLanguageId: "el",
    languageTitle: "Greek",
    voiceList: ["Melina"],
  },
  {
    youdaoLanguageId: "da",
    appleDetectChineseLanguageTitle: "丹麦语",
    deepLSourceLanguageId: "DA",
    francLanguageId: "dan",
    aliyunLanguageId: "da",
    baiduLanguageId: "dan",
    languageTitle: "Danish",
    voiceList: ["Sara"],
  },
  {
    youdaoLanguageId: "fi",
    appleDetectChineseLanguageTitle: "芬兰语",
    deepLSourceLanguageId: "FI",
    francLanguageId: "fin",
    aliyunLanguageId: "fi",
    baiduLanguageId: "fin",
    languageTitle: "Finnish",
    voiceList: ["Satu"],
  },
  {
    youdaoLanguageId: "pl",
    appleDetectChineseLanguageTitle: "波兰语",
    deepLSourceLanguageId: "PL",
    francLanguageId: "pol",
    aliyunLanguageId: "pl",
    baiduLanguageId: "pl",
    languageTitle: "Polish",
    voiceList: ["Zosia"],
  },
  {
    youdaoLanguageId: "cs",
    appleDetectChineseLanguageTitle: "捷克语",
    deepLSourceLanguageId: "CS",
    francLanguageId: "ces",
    aliyunLanguageId: "cs",
    baiduLanguageId: "cs",
    languageTitle: "Czech",
    voiceList: ["Zuzana"],
  },
];
