import { describe, expect, it } from "vitest";
import { buildDetailMarkdown } from "./TranslationDetail";
import type { Translation } from "../lib/types";

const wordItem: Translation = {
  id: "w1",
  word: "conjecture",
  translation: "припущення",
  partOfSpeech: "noun",
  example: "His conclusions were mere conjecture.",
  exampleTranslation: "Його висновки були лише припущеннями.",
  timestamp: 1,
  type: "word",
};

const textItem: Translation = {
  id: "t1",
  word: "Hello world",
  translation: "Привіт світ",
  partOfSpeech: "",
  example: "",
  exampleTranslation: "",
  timestamp: 1,
  type: "text",
};

describe("buildDetailMarkdown", () => {
  it("routes word items through the structured word builder", () => {
    const md = buildDetailMarkdown(wordItem);
    // Word builder emits the POS line; text builder does not.
    expect(md).toContain("*(noun)*");
    expect(md).toContain("**Example:**");
  });

  it("forwards originalInput so corrections surface", () => {
    const md = buildDetailMarkdown(wordItem, "conjectur");
    expect(md).toContain('Corrected from "conjectur"');
  });

  it("omits the correction note when originalInput matches", () => {
    const md = buildDetailMarkdown(wordItem, "conjecture");
    expect(md).not.toContain("Corrected from");
  });

  it("routes text items through the text builder (no POS section)", () => {
    const md = buildDetailMarkdown(textItem);
    expect(md).toContain("## Translation");
    expect(md).toContain("## Original");
    expect(md).not.toContain("*(noun)*");
  });
});
