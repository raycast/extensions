/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DictionaryContent, DictionarySection } from "@/core/content/types";
import type { QueryInput } from "@/core/results/types";

import type { LingueeParseResult } from "./types";

export function buildLingueeContent(query: QueryInput, parsed: LingueeParseResult): DictionaryContent {
  const { result, queryWordInfo } = parsed;
  const hasExact = Boolean(result?.wordItems.length);
  const queryInfo = {
    ...queryWordInfo,
    word: (hasExact && queryWordInfo.word) || query.word,
    fromLanguage: (hasExact && queryWordInfo.fromLanguage) || query.fromLanguage,
    toLanguage: (hasExact && queryWordInfo.toLanguage) || query.toLanguage,
    isWord: query.isWord ?? queryWordInfo.isWord,
  };
  const sections: DictionarySection[] = [];
  if (result) {
    const translation = result.wordItems[0]?.entries[0]?.text;
    if (translation?.trim()) sections.push({ kind: "translation", text: translation, lemma: queryInfo.word });
    for (const { word, placeholder, pos, entries } of result.wordItems) {
      sections.push({ kind: "equivalents", headword: { word, qualifier: placeholder, partOfSpeech: pos }, entries });
    }
    if (result.examples.length) sections.push({ kind: "examples", entries: result.examples.slice(0, 3) });
    if (result.relatedWords.length) {
      sections.push({ kind: "pairs", relation: "related", entries: result.relatedWords.slice(0, 3) });
    }
    if (result.wikipedias.length) sections.push({ kind: "summary", source: "wikipedia", entries: result.wikipedias });
  }
  return { kind: "dictionary", query: queryInfo, sections };
}
