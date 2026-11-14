/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import {
  array,
  boolean,
  decodeQueryWordInfo,
  invalid,
  member,
  optional,
  record,
  strings,
  text,
} from "@/core/results/decodeFields";

import type { ContentDefinition, ContentEquivalent, ContentExample, DictionarySection, ProviderContent } from "./types";

/** Decode stored semantic content without retaining vendor payloads or display fields. */
export function decodeProviderContent(value: unknown): ProviderContent {
  const source = record(value, "content");
  const query = decodeQueryWordInfo(source.query, "content.query");
  switch (source.kind) {
    case "translation":
      return { kind: source.kind, query, paragraphs: strings(source.paragraphs, "content.paragraphs") };
    case "dictionary":
      return { kind: source.kind, query, sections: array(source.sections, decodeSection, "content.sections") };
    default:
      throw invalid("content.kind");
  }
}

function decodeSection(value: unknown, path: string): DictionarySection {
  const source = record(value, path);
  switch (source.kind) {
    case "translation":
      return {
        kind: source.kind,
        text: text(source.text, `${path}.text`),
        lemma: optional(source.lemma, text, `${path}.lemma`),
        pronunciation: optional(source.pronunciation, text, `${path}.pronunciation`),
      };
    case "equivalents": {
      const headword = record(source.headword, `${path}.headword`);
      return {
        kind: source.kind,
        headword: {
          word: text(headword.word, `${path}.headword.word`),
          qualifier: optional(headword.qualifier, text, `${path}.headword.qualifier`),
          partOfSpeech: optional(headword.partOfSpeech, text, `${path}.headword.partOfSpeech`),
        },
        entries: array(source.entries, decodeEquivalent, `${path}.entries`),
      };
    }
    case "definitions":
      return { kind: source.kind, entries: array(source.entries, decodeDefinition, `${path}.entries`) };
    case "pairs":
      return {
        kind: source.kind,
        relation: member(source.relation, ["form", "phrase", "related", "web-translation"], `${path}.relation`),
        entries: array(
          source.entries,
          (value, path) => {
            const entry = record(value, path);
            return {
              expression: text(entry.expression, `${path}.expression`),
              meaning: text(entry.meaning, `${path}.meaning`),
              partOfSpeech: optional(entry.partOfSpeech, text, `${path}.partOfSpeech`),
            };
          },
          `${path}.entries`,
        ),
      };
    case "form-set":
      return {
        kind: source.kind,
        forms: array(
          source.forms,
          (value, path) => {
            const form = record(value, path);
            return { label: text(form.label, `${path}.label`), value: text(form.value, `${path}.value`) };
          },
          `${path}.forms`,
        ),
      };
    case "examples":
      return { kind: source.kind, entries: array(source.entries, decodeExample, `${path}.entries`) };
    case "summary":
      return {
        kind: source.kind,
        source: member(source.source, ["encyclopedia", "wikipedia"], `${path}.source`),
        entries: array(
          source.entries,
          (value, path) => {
            const entry = record(value, path);
            return { subject: text(entry.subject, `${path}.subject`), text: text(entry.text, `${path}.text`) };
          },
          `${path}.entries`,
        ),
      };
    case "chinese-entry":
      return {
        kind: source.kind,
        entries: array(
          source.entries,
          (value, path) => {
            const entry = record(value, path);
            return {
              pronunciation: optional(entry.pronunciation, text, `${path}.pronunciation`),
              summary: text(entry.summary, `${path}.summary`),
              markdown: text(entry.markdown, `${path}.markdown`),
            };
          },
          `${path}.entries`,
        ),
      };
    default:
      throw invalid(`${path}.kind`);
  }
}

function decodeEquivalent(value: unknown, path: string): ContentEquivalent {
  const source = record(value, path);
  return {
    text: text(source.text, `${path}.text`),
    partOfSpeech: optional(source.partOfSpeech, text, `${path}.partOfSpeech`),
    prominent: boolean(source.prominent, `${path}.prominent`),
    frequency: member(
      source.frequency,
      ["common", "often", "almost-always", "less-common", "special-forms"],
      `${path}.frequency`,
    ),
    inflectionNote: optional(source.inflectionNote, text, `${path}.inflectionNote`),
    firstExampleTranslation: optional(source.firstExampleTranslation, text, `${path}.firstExampleTranslation`),
  };
}

function decodeDefinition(value: unknown, path: string): ContentDefinition {
  const source = record(value, path);
  switch (source.kind) {
    case "plain":
      return {
        kind: source.kind,
        text: text(source.text, `${path}.text`),
        note: optional(source.note, text, `${path}.note`),
      };
    case "structured":
      return {
        kind: source.kind,
        meanings: strings(source.meanings, `${path}.meanings`),
        partOfSpeech: optional(source.partOfSpeech, text, `${path}.partOfSpeech`),
        explanation: optional(source.explanation, text, `${path}.explanation`),
        examples: array(source.examples, decodeExample, `${path}.examples`),
      };
    default:
      throw invalid(`${path}.kind`);
  }
}

function decodeExample(value: unknown, path: string): ContentExample {
  const source = record(value, path);
  return {
    sentence: text(source.sentence, `${path}.sentence`),
    translation: optional(source.translation, text, `${path}.translation`),
    partOfSpeech: optional(source.partOfSpeech, text, `${path}.partOfSpeech`),
  };
}
