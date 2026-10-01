import { describe, expect, it } from "vitest";

import type { DictionaryContent } from "@/core/content/types";
import { buildContentView } from "@/core/content/view";
import { DictionaryType } from "@/core/results/kinds";

import { buildAIWordContent } from "./content";
import type { AIWordResult } from "./types";

const query = { word: "run", fromLanguage: "en", toLanguage: "zh-CHS" };

describe("AI dictionary content", () => {
  it("falls back to the translation from the same response when no entry exists", () => {
    const sections = renderContent(buildAIWordContent(query, { translation: "这是一句话。", entry: null }));

    expect(sections).toHaveLength(1);
    expect(sections[0].items[0]).toMatchObject({
      kind: "translation",
      title: "这是一句话。",
      service: { query: { isWord: false } },
    });
  });

  it("keeps the resolved headword, pronunciation, definitions, and separately copyable forms", () => {
    const sections = renderContent(buildAIWordContent({ ...query, word: "ran" }, createWordResult()));

    expect(sections.map((section) => section.kind)).toEqual(["translation", "definitions", "pairs"]);
    expect(sections[0].items[0]).toMatchObject({
      subtitle: "run",
      service: { query: { isWord: true, phonetic: "rʌn" } },
    });
    expect(sections[1].items[0]).toMatchObject({
      title: "[verb] 跑; 奔跑",
      subtitle: "move quickly on foot",
    });
    expect(sections[1].items[0].renderBody()).toContain("I run daily\\.");
    expect(sections[2].items[0]).toMatchObject({ title: "past tense", subtitle: "ran" });
  });

  it("renders structured fields as literal text while preserving their copy text", () => {
    const sections = renderContent(
      buildAIWordContent(query, {
        translation: "运行",
        entry: {
          headword: "run",
          senses: [{ meanings: ["a*b"], definition: "<value>", examples: [{ sentence: "[example]" }] }],
          forms: [],
        },
      }),
    );

    expect(sections[1].items[0]).toMatchObject({
      title: "a*b",
      copyText: "a*b\n<value>\n[example]",
    });
    expect(sections[1].items[0].renderBody()).toBe("**a\\*b**\n\n&lt;value&gt;\n\n- **\\[example\\]**");
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

function renderContent(content: DictionaryContent) {
  return buildContentView(
    {
      services: [{ type: DictionaryType.AI, serviceId: "ai", serviceLabel: "AI Dictionary", serviceOrder: 0, content }],
      isShowDetail: false,
    },
    true,
  );
}
