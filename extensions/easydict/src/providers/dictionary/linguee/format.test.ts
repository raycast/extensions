import { describe, expect, it } from "vitest";

import type { QueryWordInfo } from "@/types/query";

import { formatLingueeDisplaySections } from "./format";
import type { LingueeDictionaryResult, LingueeWordItem } from "./types";
import { LingueeListItemType } from "./types";

const queryWordInfo: QueryWordInfo = { word: "good", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };

describe("Linguee display formatter", () => {
  it("starts with Examples when only examples are returned", () => {
    const sections = formatLingueeDisplaySections(queryWordInfo, createResult({ examples: [createExample()] }));

    expect(sections.map((section) => section.type)).toEqual([LingueeListItemType.Example]);
    expect(sections[0]).toMatchObject({
      sectionTitle: "Examples:",
      items: [{ title: "a good book" }],
    });
  });

  it("does not create a Translation section when the first translation is blank", () => {
    const sections = formatLingueeDisplaySections(
      queryWordInfo,
      createResult({ wordItems: [createWordItem("   ")], examples: [createExample()] }),
    );

    expect(sections.some((section) => section.type === LingueeListItemType.Translation)).toBe(false);
  });

  it("keeps a real first translation in the Translation section", () => {
    const sections = formatLingueeDisplaySections(
      queryWordInfo,
      createResult({ wordItems: [createWordItem("良好的")] }),
    );

    expect(sections[0]).toMatchObject({
      type: LingueeListItemType.Translation,
      items: [{ title: "良好的" }],
    });
  });
});

function createResult(overrides: Partial<LingueeDictionaryResult> = {}): LingueeDictionaryResult {
  return {
    wordItems: [],
    examples: [],
    relatedWords: [],
    wikipedias: [],
    ...overrides,
  };
}

function createExample() {
  return {
    example: { text: "a good book", pos: "" },
    translations: [{ text: "一本好书", pos: "" }],
  };
}

function createWordItem(translation: string): LingueeWordItem {
  return {
    word: "good",
    title: "good",
    featured: true,
    pos: "",
    placeholder: "",
    audioUrl: "",
    translationItems: [
      {
        featured: true,
        translation,
        pos: "",
        audioUrl: "",
        examples: [],
        frequencyTag: { tagForms: "", displayType: LingueeListItemType.Common },
      },
    ],
  };
}
