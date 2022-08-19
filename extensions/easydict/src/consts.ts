/*
 * @author: tisfeng
 * @createTime: 2022-06-24 22:36
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-13 22:39
 * @fileName: consts.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

export const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36";

export const clipboardQueryTextKey = "clipboardQueryTextKey";

export enum YoudaoErrorCode {
  Success = "0",
  TargetLanguageNotSupported = "102",
  InvalidApplicationID = "108", // 应用ID无效
  InvalidSignature = "202", // 签名无效，AppSecret不正确
  AccessFrequencyLimited = "207",
  TranslationQueryFailed = "302", // 翻译查询失败, such as 'con' 😓
  InsufficientAccountBalance = "401",
}

// https://fanyi-api.baidu.com/doc/21
export enum BaiduErrorCode {
  Success = "52000",
  AccessFrequencyLimited = "54003",
  InsufficientAccountBalance = "54004",
  TargetLanguageNotSupported = "58001",
}

export const youdaoErrorCodeUrl = encodeURI(
  "https://ai.youdao.com/DOCSIRMA/html/自然语言翻译/API文档/文本翻译服务/文本翻译服务-API文档.html#section-11"
);
