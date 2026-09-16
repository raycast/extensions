import { describe, expect, it } from "vitest";
import { countText, formatReadingTime } from "./count";

describe("countText words", () => {
  it("counts space-delimited English words", () => {
    expect(countText("hello world foo").words).toBe(3);
  });

  it("counts each CJK character as a word in pure Chinese text", () => {
    expect(countText("我是开发者").words).toBe(5);
  });

  it("counts mixed Chinese/English text without spaces", () => {
    // 11 hanzi + github + star = 13
    expect(countText("我在github上维护有几万star的项目").words).toBe(13);
  });

  it("does not count standalone punctuation as words", () => {
    expect(countText("你好，世界。").words).toBe(4);
    expect(countText("hello , world !").words).toBe(2);
  });

  it("counts Japanese kana and Korean hangul as words", () => {
    expect(countText("こんにちは").words).toBe(5);
    expect(countText("안녕하세요").words).toBe(5);
  });

  it("returns 0 for empty and whitespace-only text", () => {
    expect(countText("").words).toBe(0);
    expect(countText("   \n\t").words).toBe(0);
  });
});

describe("countText sentences", () => {
  it("counts English sentences", () => {
    expect(countText("Hello there. How are you? Fine!").sentences).toBe(3);
  });

  it("counts Chinese sentences ending with 。！？", () => {
    expect(countText("我是开发者。你好吗？很好！").sentences).toBe(3);
  });

  it("does not split on decimal points", () => {
    expect(countText("Pi is 3.14159 approximately.").sentences).toBe(1);
  });

  it("treats terminator-less text as one sentence", () => {
    expect(countText("no terminator here").sentences).toBe(1);
  });
});

describe("countText characters", () => {
  it("counts grapheme clusters, not UTF-16 units", () => {
    const family = "👨‍👩‍👧"; // 8 UTF-16 code units, 1 grapheme
    expect(countText(family).characters).toBe(1);
    expect(countText(`a${family}b`).characters).toBe(3);
  });

  it("excludes whitespace in charactersNoSpaces", () => {
    const result = countText("a b\nc");
    expect(result.characters).toBe(5);
    expect(result.charactersNoSpaces).toBe(3);
  });
});

describe("countText lines and paragraphs", () => {
  it("counts lines", () => {
    expect(countText("one\ntwo\nthree").lines).toBe(3);
  });

  it("counts paragraphs separated by blank lines", () => {
    expect(countText("para one\n\npara two\n\n\npara three").paragraphs).toBe(3);
  });

  it("counts a single block as one paragraph", () => {
    expect(countText("just one\nparagraph").paragraphs).toBe(1);
  });
});

describe("countText tokens", () => {
  it("produces exact counts for both encodings", () => {
    const result = countText("hello world");
    expect(result.tokensO200k).toBeGreaterThan(0);
    expect(result.tokensCl100k).toBeGreaterThan(0);
  });

  it("uses o200k_base for GPT-4o instead of a scaled cl100k estimate", () => {
    // o200k_base is generally more efficient on CJK than cl100k_base
    const result = countText("我是开发者，在github上维护了一些项目。");
    expect(result.tokensO200k).toBeLessThan(result.tokensCl100k);
  });

  it("does not throw on special-token text", () => {
    expect(() => countText("before <|endoftext|> after")).not.toThrow();
  });
});

describe("reading time", () => {
  it("estimates 1 minute for 200 English words", () => {
    const text = Array(200).fill("word").join(" ");
    expect(countText(text).readingTimeMinutes).toBeCloseTo(1, 5);
  });

  it("estimates 1 minute for 300 Chinese characters", () => {
    const text = "字".repeat(300);
    expect(countText(text).readingTimeMinutes).toBeCloseTo(1, 5);
  });

  it("formats human-readable durations", () => {
    expect(formatReadingTime(0)).toBe("0 min");
    expect(formatReadingTime(0.4)).toBe("24 sec");
    expect(formatReadingTime(2.4)).toBe("2 min");
    expect(formatReadingTime(65)).toBe("1 h 5 min");
    expect(formatReadingTime(120)).toBe("2 h");
  });
});
