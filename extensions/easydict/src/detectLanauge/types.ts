/*
 * @author: tisfeng
 * @createTime: 2022-08-12 18:38
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-08-19 16:05
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

import { QueryResponse } from "../types";

export enum LanguageDetectType {
  Simple = "Simple",
  Franc = "Franc",
  Apple = "Apple",
  Tencent = "Tencent",
  Baidu = "Baidu",
  Google = "Google",
}

export interface LanguageDetectTypeResult {
  type: LanguageDetectType;
  youdaoLanguageId: string; // pl
  sourceLanguageId: string; // eg. apple detect 波兰语
  confirmed: boolean;
  detectedLanguageArray?: [string, number][]; // [['ita', 1], ['fra', 0.6]]
  result?: QueryResponse;
}
