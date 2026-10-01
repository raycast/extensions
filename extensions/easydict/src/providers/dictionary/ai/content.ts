/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { DictionaryContent, DictionarySection } from "@/core/content/types";
import type { QueryInput } from "@/core/results/types";

import type { AIWordResult } from "./types";

export function buildAIWordContent(query: QueryInput, result: AIWordResult): DictionaryContent {
  const { entry } = result;
  const sections: DictionarySection[] = [{ kind: "translation", text: result.translation, lemma: entry?.headword }];
  if (entry?.senses.length) {
    sections.push({
      kind: "definitions",
      entries: entry.senses.map((sense) => ({
        kind: "structured",
        partOfSpeech: sense.partOfSpeech,
        meanings: sense.meanings,
        explanation: sense.definition,
        examples: sense.examples,
      })),
    });
  }
  if (entry?.forms.length) {
    sections.push({
      kind: "pairs",
      relation: "form",
      entries: entry.forms.map((form) => ({ expression: form.label, meaning: form.value })),
    });
  }
  return {
    kind: "dictionary",
    query: { ...query, isWord: entry !== null, phonetic: entry?.pronunciation },
    sections,
  };
}
