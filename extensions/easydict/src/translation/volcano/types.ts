/*
 * @author: tisfeng
 * @createTime: 2022-09-26 22:59
 * @lastEditor: tisfeng
 * @lastEditTime: 2022-09-27 00:15
 * @fileName: types.ts
 *
 * Copyright (c) 2022 by tisfeng, All Rights Reserved.
 */

/**
 * Volcano Translate.
 */
export interface VolcanoTranslateResult {
  TranslationList: VolcanoTranslationList[];
  ResponseMetaData: VolcanoResponseMetaData;
}

export interface VolcanoResponseMetaData {
  RequestId: string;
  Action: string;
  Version: Date;
  Service: string;
  Region: string;
  Error?: VolcanoError;
}

export interface VolcanoTranslationList {
  Translation: string;
  DetectedSourceLanguage?: string; // 仅在源语言未指定时会返回结果
  //   Extra?: null;
}

export interface VolcanoError {
  Code: string;
  Message: string;
}

/**
 * Volcano Detect.
 */
export interface VolcanoDetectResult {
  DetectedLanguageList: VolcanoDetectedLanguageList[];
  ResponseMetaData: VolcanoResponseMetaData;
}
export interface VolcanoDetectedLanguageList {
  Language: string;
  Confidence: number; // 置信度范围为0-1；置信度越高，检测结果越可靠
}
