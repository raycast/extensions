import { describe, expect, it } from "vitest";

import type { AIWordResult } from "@/ai-providers/dictionary/types";

import { formatAIWordResult } from "./format";
import { AIDictionaryListItemType } from "./types";

const query = { word: "run", fromLanguage: "en", toLanguage: "zh-CHS" };

describe("AI dictionary display formatter", () => {
  it("falls back to the translation from the same response when no entry exists", () => {
    const sections = formatAIWordResult(query, { translation: "这是一句话。", entry: null });

    expect(sections).toHaveLength(1);
    expect(sections[0].items[0]).toMatchObject({
      displayType: AIDictionaryListItemType.Translation,
      title: "这是一句话。",
      queryWordInfo: { isWord: false },
    });
  });

  it("formats senses, examples, forms, and pronunciation deterministically", () => {
    const sections = formatAIWordResult({ ...query, word: "ran" }, createWordResult());

    expect(sections.map((section) => section.type)).toEqual([
      AIDictionaryListItemType.Translation,
      AIDictionaryListItemType.Definition,
      AIDictionaryListItemType.Forms,
    ]);
    expect(sections[0].items[0]).toMatchObject({
      subtitle: "run",
      queryWordInfo: { isWord: true, phonetic: "rʌn" },
    });
    expect(sections[1].items[0]).toMatchObject({
      title: "[verb] 跑; 奔跑",
      subtitle: "move quickly on foot",
      detailsMarkdown: expect.stringContaining("I run daily."),
    });
    expect(sections[2].items[0]).toMatchObject({ title: "past tense", subtitle: "ran" });
  });
});

function createWordResult(): AIWordResult {
  return {
    translation: "跑",
    entry: {
      headword: "run",
      pronunciation: "rʌn",
      senses: [
        {
          partOfSpeech: "verb",
          meanings: ["跑", "奔跑"],
          definition: "move quickly on foot",
          examples: [{ sentence: "I run daily.", translation: "我每天跑步。" }],
        },
      ],
      forms: [{ label: "past tense", value: "ran" }],
    },
  };
}
