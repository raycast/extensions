/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { LanguageCode } from "@/core/language/types";

/** Validated fields consumed by the Youdao content builder; no wire objects escape the decoder. */
export interface YoudaoDictionaryData {
  word?: string;
  language?: LanguageCode;
  guessedChinese: boolean;
  isWord: boolean;
  phonetic?: string;
  speechUrl?: string;
  examTypes?: string[];
  explanations: { text: string; note: string }[];
  forms: { label: string; value: string }[];
  webEntries: { key: string; values: string[] }[];
  modernChineseDict: ModernChineseEntry[];
  baike?: YoudaoSummary;
  wikipedia?: YoudaoSummary;
}

export interface YoudaoSummary {
  subject: string;
  text: string;
}

export interface ModernChineseEntry {
  pronunciation?: string;
  senses: ChineseSense[];
}

export interface ChineseSense {
  category?: string;
  definition?: string | string[];
  examples: string[];
  subsenses: ChineseSense[];
}
