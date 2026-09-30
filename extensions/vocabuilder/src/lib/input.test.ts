import { describe, it, expect } from "vitest";
import {
  normalizeWordInput,
  normalizeTextInput,
  asJsonStringLiteral,
  looksLikeWordAttempt,
  MAX_VOCAB_LENGTH,
  MAX_PHRASE_TOKENS,
  MAX_TEXT_LENGTH,
  WORD_ATTEMPT_MAX_LENGTH,
} from "./input";

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

  it("accepts input at exactly MAX_VOCAB_LENGTH", () => {
    const word = "a".repeat(MAX_VOCAB_LENGTH);
    expect(normalizeWordInput(word)).toBe(word);
  });

  it("rejects input at MAX_VOCAB_LENGTH + 1", () => {
    const word = "a".repeat(MAX_VOCAB_LENGTH + 1);
    expect(normalizeWordInput(word)).toBeNull();
  });

  it("rejects words with numbers", () => {
    expect(normalizeWordInput("abc123")).toBeNull();
  });

  it("accepts a two-word phrase (idiom)", () => {
    expect(normalizeWordInput("red herring")).toBe("red herring");
  });

  it("accepts a phrasal verb", () => {
    expect(normalizeWordInput("give up")).toBe("give up");
  });

  it("accepts a phrase at exactly MAX_PHRASE_TOKENS words", () => {
    const phrase = Array.from({ length: MAX_PHRASE_TOKENS }, () => "word").join(" ");
    expect(normalizeWordInput(phrase)).toBe(phrase);
  });

  it("rejects a phrase exceeding MAX_PHRASE_TOKENS", () => {
    const tooMany = Array.from({ length: MAX_PHRASE_TOKENS + 1 }, () => "word").join(" ");
    expect(normalizeWordInput(tooMany)).toBeNull();
  });

  it("collapses multiple internal spaces", () => {
    expect(normalizeWordInput("red    herring")).toBe("red herring");
    expect(normalizeWordInput("red\therring")).toBe("red herring");
  });

  it("accepts multi-word Cyrillic phrase", () => {
    expect(normalizeWordInput("синій птах")).toBe("синій птах");
  });

  it("accepts phrase with apostrophes and hyphens inside tokens", () => {
    expect(normalizeWordInput("don't give up")).toBe("don't give up");
    expect(normalizeWordInput("well-known fact")).toBe("well-known fact");
  });

  it("accepts multi-hyphen compound tokens", () => {
    expect(normalizeWordInput("mother-in-law")).toBe("mother-in-law");
    expect(normalizeWordInput("well-to-do")).toBe("well-to-do");
    expect(normalizeWordInput("state-of-the-art")).toBe("state-of-the-art");
  });

  it("still rejects adjacent joiner characters", () => {
    expect(normalizeWordInput("a--b")).toBeNull();
    expect(normalizeWordInput("a-'b")).toBeNull();
  });

  it("rejects phrase containing punctuation between tokens", () => {
    expect(normalizeWordInput("red, herring")).toBeNull();
    expect(normalizeWordInput("red. herring")).toBeNull();
    expect(normalizeWordInput("red? herring")).toBeNull();
  });

  it("rejects phrase containing digits in a token", () => {
    expect(normalizeWordInput("room 101")).toBeNull();
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

describe("looksLikeWordAttempt", () => {
  it("flags short alphanumeric junk (letters + digits, no space)", () => {
    expect(looksLikeWordAttempt("fahj89sdf")).toBe(true);
  });

  it("flags short digit-only inputs", () => {
    expect(looksLikeWordAttempt("12345")).toBe(true);
  });

  it("flags short punctuation-bearing inputs without spaces", () => {
    expect(looksLikeWordAttempt("COVID-19")).toBe(true);
    expect(looksLikeWordAttempt("e.g.")).toBe(true);
  });

  it("does not flag inputs that contain whitespace (those go to text path)", () => {
    expect(looksLikeWordAttempt("hello world")).toBe(false);
    expect(looksLikeWordAttempt("fahj 89sdf")).toBe(false);
  });

  it("does not flag inputs longer than WORD_ATTEMPT_MAX_LENGTH", () => {
    expect(looksLikeWordAttempt("a".repeat(WORD_ATTEMPT_MAX_LENGTH + 1))).toBe(false);
  });

  it("accepts at exactly WORD_ATTEMPT_MAX_LENGTH", () => {
    expect(looksLikeWordAttempt("a".repeat(WORD_ATTEMPT_MAX_LENGTH))).toBe(true);
  });

  it("does not flag empty or whitespace-only input", () => {
    expect(looksLikeWordAttempt("")).toBe(false);
    expect(looksLikeWordAttempt("   ")).toBe(false);
  });

  it("trims before measuring", () => {
    expect(looksLikeWordAttempt("  fahj89sdf  ")).toBe(true);
  });
});

describe("asJsonStringLiteral", () => {
  it("escapes internal quotes", () => {
    expect(asJsonStringLiteral('say "hi"')).toBe('"say \\"hi\\""');
  });

  it("escapes newlines", () => {
    expect(asJsonStringLiteral("line1\nline2")).toBe('"line1\\nline2"');
  });
});
