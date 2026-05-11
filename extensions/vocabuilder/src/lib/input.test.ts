import { describe, it, expect } from "vitest";
import { normalizeWordInput, normalizeTextInput, asJsonStringLiteral, MAX_WORD_LENGTH, MAX_TEXT_LENGTH } from "./input";

describe("normalizeWordInput", () => {
  it("accepts basic Latin words", () => {
    expect(normalizeWordInput("hello")).toBe("hello");
  });

  it("trims whitespace", () => {
    expect(normalizeWordInput("  hello  ")).toBe("hello");
  });

  it("accepts CJK characters", () => {
    expect(normalizeWordInput("日本語")).toBe("日本語");
  });

  it("accepts Cyrillic characters", () => {
    expect(normalizeWordInput("привіт")).toBe("привіт");
  });

  it("accepts accented characters", () => {
    expect(normalizeWordInput("résumé")).toBe("résumé");
    expect(normalizeWordInput("naïve")).toBe("naïve");
  });

  it("accepts word with apostrophe", () => {
    expect(normalizeWordInput("don't")).toBe("don't");
  });

  it("accepts word with hyphen", () => {
    expect(normalizeWordInput("well-known")).toBe("well-known");
  });

  it("rejects double punctuation", () => {
    expect(normalizeWordInput("don't--work")).toBeNull();
  });

  it("rejects leading punctuation", () => {
    expect(normalizeWordInput("-start")).toBeNull();
    expect(normalizeWordInput("'start")).toBeNull();
  });

  it("rejects empty string", () => {
    expect(normalizeWordInput("")).toBeNull();
  });

  it("rejects whitespace-only string", () => {
    expect(normalizeWordInput("   ")).toBeNull();
  });

  it("accepts word at exactly MAX_WORD_LENGTH", () => {
    const word = "a".repeat(MAX_WORD_LENGTH);
    expect(normalizeWordInput(word)).toBe(word);
  });

  it("rejects word at MAX_WORD_LENGTH + 1", () => {
    const word = "a".repeat(MAX_WORD_LENGTH + 1);
    expect(normalizeWordInput(word)).toBeNull();
  });

  it("rejects words with spaces", () => {
    expect(normalizeWordInput("two words")).toBeNull();
  });

  it("rejects words with numbers", () => {
    expect(normalizeWordInput("abc123")).toBeNull();
  });
});

describe("normalizeTextInput", () => {
  it("accepts and trims text", () => {
    expect(normalizeTextInput("  hello world  ")).toBe("hello world");
  });

  it("rejects empty string", () => {
    expect(normalizeTextInput("")).toBeNull();
  });

  it("rejects whitespace-only string", () => {
    expect(normalizeTextInput("   ")).toBeNull();
  });

  it("accepts text at exactly MAX_TEXT_LENGTH", () => {
    const text = "a".repeat(MAX_TEXT_LENGTH);
    expect(normalizeTextInput(text)).toBe(text);
  });

  it("rejects text at MAX_TEXT_LENGTH + 1", () => {
    const text = "a".repeat(MAX_TEXT_LENGTH + 1);
    expect(normalizeTextInput(text)).toBeNull();
  });
});

describe("asJsonStringLiteral", () => {
  it("wraps string in double quotes", () => {
    expect(asJsonStringLiteral("hello")).toBe('"hello"');
  });

  it("escapes internal quotes", () => {
    expect(asJsonStringLiteral('say "hi"')).toBe('"say \\"hi\\""');
  });

  it("escapes newlines", () => {
    expect(asJsonStringLiteral("line1\nline2")).toBe('"line1\\nline2"');
  });
});
