/*
 * @author: tisfeng
 * @createTime: 2022-09-18 23:35
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-19 00:33
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

export interface BingConfig {
  IG: string; // F4D70DC299D549CE824BFCD7506749E7
  IID: string; // translator.5023
  key: string; // key is timestamp: 1663381745198
  token: string; // -2ptk6FgbTk2jgZWATe8L_VpY9A_niur
  expirationInterval: string; // 3600000, 10 min
  count: number; // current token request count, default is 1.
}

// Bing translate result, https://learn.microsoft.com/zh-cn/azure/cognitive-services/translator/reference/v3-0-translate
export interface BingTranslateResult {
  detectedLanguage: BingDetectedLanguage;
  translations: BingTranslation[];
}

export interface BingDetectedLanguage {
  language: string;
  score: number;
}

export interface BingTranslation {
  text: string;
  to: string;
  sentLen: BingSentLen; // 输入和输出文本中的句子边界
  transliteration?: BingTransliteration; // 音译，英译中时有，eg. good -> 好 hǎo
}

export interface BingSentLen {
  srcSentLen: number[];
  transSentLen: number[];
}

export interface BingTransliteration {
  script: string; // Latn
  text: string; // hǎo
}
