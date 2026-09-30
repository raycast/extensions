/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { LanguageDetectType } from "@/types/api";

export interface DetectedLangModel<T = unknown> {
  type: LanguageDetectType;
  youdaoLangCode: string; // pl
  sourceLangCode: string; // eg. apple detect 波兰语
  confirmed: boolean;
  detectedLanguageArray?: [string, number][]; // [['ita', 1], ['fra', 0.6]]
  result?: T;
  prior?: boolean; // has higher priority than other detected languages, such as has two identical detected languages.
}
