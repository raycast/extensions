import { describe, it, expect } from "vitest";
import { computeDiff, MAX_DIFF_WORDS } from "../../check-grammar";

describe("computeDiff", () => {
  it("detects word changes", () => {
    const result = computeDiff("hello wrold", "hello world");
    expect(result.corrections).toBeGreaterThan(0);
    expect(result.markdown).toContain("~~wrold~~");
    expect(result.markdown).toContain("**world**");
  });

  it("returns zero corrections when text is identical", () => {
    const result = computeDiff("hello world", "hello world");
    expect(result.corrections).toBe(0);
  });

  it("skips diff for texts exceeding MAX_DIFF_WORDS", () => {
    const longText = Array.from({ length: MAX_DIFF_WORDS + 1 }, (_, i) => `word${i}`).join(" ");
    const result = computeDiff(longText, longText + " extra");
    expect(result.corrections).toBe(1);
    expect(result.markdown).not.toContain("~~");
  });

  it("handles added words", () => {
    const result = computeDiff("hello", "hello world");
    expect(result.markdown).toContain("**world**");
  });

  it("handles removed words", () => {
    const result = computeDiff("hello world", "hello");
    expect(result.markdown).toContain("~~world~~");
  });
});
