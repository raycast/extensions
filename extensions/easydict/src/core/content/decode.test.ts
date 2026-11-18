import { describe, expect, it } from "vitest";

import { decodeProviderContent } from "./decode";
import type { DictionaryContent } from "./types";

const query = { word: "行", fromLanguage: "zh-CHS", toLanguage: "en" };

const dictionary: DictionaryContent = {
  kind: "dictionary",
  query: { ...query, isWord: true, phonetic: "", examTypes: ["CET4"], speechUrl: "https://example.com/audio.mp3" },
  sections: [
    { kind: "translation", text: "go", lemma: "行", pronunciation: "/ xíng /" },
    {
      kind: "equivalents",
      headword: { word: "go", qualifier: "sth.", partOfSpeech: "v" },
      entries: (["common", "often", "almost-always", "less-common", "special-forms"] as const).map((frequency) => ({
        text: "行走",
        prominent: true,
        frequency,
        partOfSpeech: "v",
        inflectionNote: "(often used)",
        firstExampleTranslation: "向前走",
      })),
    },
    {
      kind: "definitions",
      entries: [
        { kind: "plain", text: "行走", note: "动词" },
        {
          kind: "structured",
          meanings: ["行走", "前进"],
          partOfSpeech: "verb",
          explanation: "从一处到另一处。",
          examples: [{ sentence: "Go ahead.", translation: "向前走。", partOfSpeech: "verb" }],
        },
      ],
    },
    ...(["form", "phrase", "related", "web-translation"] as const).map((relation) => ({
      kind: "pairs" as const,
      relation,
      entries: [{ expression: "going", meaning: "正在走", partOfSpeech: "v" }],
    })),
    { kind: "form-set", forms: [{ label: "过去式", value: "went" }] },
    { kind: "examples", entries: [{ sentence: "Go.", translation: "走。", partOfSpeech: "verb" }] },
    { kind: "summary", source: "encyclopedia", entries: [{ subject: "行", text: "汉字。" }] },
    { kind: "summary", source: "wikipedia", entries: [{ subject: "", text: "A word." }] },
    {
      kind: "chinese-entry",
      entries: [{ pronunciation: "háng", summary: "~  1. 行列", markdown: "háng\n\n~\n\n1. 行列" }],
    },
  ],
};

describe("persisted provider content", () => {
  it("round-trips every dictionary section and its optional semantic fields", () => {
    expect(decodeProviderContent(JSON.parse(JSON.stringify(dictionary)))).toEqual(dictionary);
  });

  it.each([{ paragraphs: [] }, { paragraphs: ["一", "", "二"] }, { paragraphs: ["  一\n\n二  "] }])(
    "preserves translation paragraph boundaries, whitespace, and empty results: %j",
    ({ paragraphs }) => {
      const content = { kind: "translation", query, paragraphs };
      expect(decodeProviderContent(content)).toEqual(content);
    },
  );

  it("preserves an empty first section, empty web slots, and a pronunciation separate from query metadata", () => {
    const content: DictionaryContent = {
      kind: "dictionary",
      query,
      sections: [
        { kind: "equivalents", headword: { word: "行" }, entries: [] },
        { kind: "translation", text: "", pronunciation: "/ hàng /" },
        {
          kind: "pairs",
          relation: "phrase",
          entries: [
            { expression: "other", meaning: "" },
            { expression: "行", meaning: "go" },
          ],
        },
      ],
    };
    const decoded = decodeProviderContent(content);

    expect(decoded).toEqual(content);
    expect(decoded.query.phonetic).toBeUndefined();
    expect(decodeProviderContent({ kind: "dictionary", query, sections: [] })).toEqual({
      kind: "dictionary",
      query,
      sections: [],
    });
  });

  it("drops old display and vendor fields at each decoded object boundary", () => {
    const content = {
      kind: "dictionary",
      query: { ...query, result: { source: "vendor" } },
      result: { payload: true },
      displaySections: [{ title: "old display" }],
      sections: [
        {
          kind: "definitions",
          key: "old key",
          sectionTitle: "old heading",
          entries: [
            { kind: "plain", text: "行走", note: "动词", detailsMarkdown: "old body", queryType: "old provider" },
          ],
        },
      ],
    };

    expect(decodeProviderContent(content)).toEqual({
      kind: "dictionary",
      query,
      sections: [{ kind: "definitions", entries: [{ kind: "plain", text: "行走", note: "动词" }] }],
    });
  });

  it.each([
    { name: "non-object content", value: null },
    { name: "unknown content kind", value: { kind: "provider", query, sections: [] } },
    {
      name: "invalid query metadata",
      value: { kind: "translation", query: { ...query, examTypes: [3] }, paragraphs: [] },
    },
    { name: "mixed paragraph types", value: { kind: "translation", query, paragraphs: ["valid", null] } },
    { name: "non-array sections", value: { kind: "dictionary", query, sections: {} } },
    { name: "unknown section kind", value: section({ kind: "raw-payload", value: {} }) },
    { name: "non-string pronunciation", value: section({ kind: "translation", text: "go", pronunciation: [] }) },
    {
      name: "non-boolean prominence",
      value: section({
        kind: "equivalents",
        headword: { word: "go" },
        entries: [{ text: "行走", prominent: "yes", frequency: "common" }],
      }),
    },
    {
      name: "unknown frequency",
      value: section({
        kind: "equivalents",
        headword: { word: "go" },
        entries: [{ text: "行走", prominent: false, frequency: "unusual" }],
      }),
    },
    {
      name: "unknown definition kind",
      value: section({ kind: "definitions", entries: [{ kind: "rich", text: "go" }] }),
    },
    {
      name: "invalid plain definition",
      value: section({ kind: "definitions", entries: [{ kind: "plain", text: {} }] }),
    },
    {
      name: "invalid structured meanings",
      value: section({ kind: "definitions", entries: [{ kind: "structured", meanings: [3], examples: [] }] }),
    },
    {
      name: "invalid nested example",
      value: section({
        kind: "definitions",
        entries: [{ kind: "structured", meanings: ["go"], examples: [{ sentence: "Go.", translation: null }] }],
      }),
    },
    { name: "unknown pair relation", value: section({ kind: "pairs", relation: "arbitrary", entries: [] }) },
    { name: "invalid form value", value: section({ kind: "form-set", forms: [{ label: "过去式", value: null }] }) },
    { name: "unknown summary source", value: section({ kind: "summary", source: "vendor", entries: [] }) },
    {
      name: "invalid Chinese Markdown",
      value: section({ kind: "chinese-entry", entries: [{ summary: "行走", markdown: {} }] }),
    },
  ])("rejects $name before content can be replayed", ({ value }) => {
    expect(() => decodeProviderContent(value)).toThrow();
  });
});

function section(value: unknown) {
  return { kind: "dictionary", query, sections: [value] };
}
