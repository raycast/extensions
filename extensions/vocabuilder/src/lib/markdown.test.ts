import { describe, it, expect } from "vitest";
import { buildTranslationDetailMarkdown, buildTextTranslationDetailMarkdown } from "./markdown";

describe("buildTranslationDetailMarkdown", () => {
  const translation = {
    word: "hello",
    translation: "привіт",
    partOfSpeech: "interjection",
    example: "Hello, how are you?",
    exampleTranslation: "Привіт, як справи?",
  };

  it("renders basic translation without correction note", () => {
    const md = buildTranslationDetailMarkdown(translation);
    expect(md).toContain("## hello");
    expect(md).toContain("**привіт**");
    expect(md).toContain("*(interjection)*");
    expect(md).not.toContain("Corrected from");
  });

  it("shows correction note when input differs from word", () => {
    const md = buildTranslationDetailMarkdown(translation, "helo");
    expect(md).toContain('Corrected from "helo"');
  });

  it("does not show correction note when input matches word", () => {
    const md = buildTranslationDetailMarkdown(translation, "hello");
    expect(md).not.toContain("Corrected from");
  });

  it("escapes markdown special characters in word", () => {
    const t = { ...translation, word: "test|word*bold_under" };
    const md = buildTranslationDetailMarkdown(t);
    expect(md).toContain("\\|");
    expect(md).toContain("\\*");
    expect(md).toContain("\\_");
  });

  it("escapes HTML entities in translation", () => {
    const t = { ...translation, translation: "a < b & c > d" };
    const md = buildTranslationDetailMarkdown(t);
    expect(md).toContain("&lt;");
    expect(md).toContain("&gt;");
  });

  it("handles multiline example with line breaks", () => {
    const t = { ...translation, example: "Line one\nLine two" };
    const md = buildTranslationDetailMarkdown(t);
    // multiline escaping joins with markdown line break
    expect(md).toContain("  \n");
  });
});

describe("buildTextTranslationDetailMarkdown", () => {
  it("renders translation and original sections", () => {
    const md = buildTextTranslationDetailMarkdown("Hello world", "Привіт світ");
    expect(md).toContain("## Translation");
    expect(md).toContain("## Original");
    expect(md).toContain("Hello world");
    expect(md).toContain("Привіт світ");
  });

  it("escapes special chars in both sections", () => {
    const md = buildTextTranslationDetailMarkdown("a|b", "c*d");
    expect(md).toContain("a\\|b");
    expect(md).toContain("c\\*d");
  });
});
