/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { ContentEquivalent, ContentExample } from "@/core/content/types";
import type { QueryWordInfo } from "@/core/results/types";

export interface LingueeParseResult {
  queryWordInfo: QueryWordInfo;
  result?: LingueeDictionaryResult;
}

export interface LingueeDictionaryResult {
  wordItems: LingueeWordItem[];
  examples: ContentExample[];
  relatedWords: { expression: string; meaning: string; partOfSpeech: string }[];
  wikipedias: { subject: string; text: string }[];
}

export interface LingueeWordItem {
  word: string;
  pos: string; // part of speech, e.g. noun, verb, adj, etc.
  placeholder: string; // eg. (sth. ~), sth.
  entries: ContentEquivalent[];
}
