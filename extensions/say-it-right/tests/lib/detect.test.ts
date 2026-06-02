import { describe, it, expect } from "vitest";
import { isSingleWord } from "../../src/lib/detect";

describe("isSingleWord", () => {
  it("treats one alphabetic token as a word", () => {
    expect(isSingleWord("serendipity")).toBe(true);
    expect(isSingleWord("  hello  ")).toBe(true);
    expect(isSingleWord("don't")).toBe(true);
  });
  it("treats multiple tokens or punctuation-bearing phrases as not a word", () => {
    expect(isSingleWord("give me a call")).toBe(false);
    expect(isSingleWord("Hello, world.")).toBe(false);
    expect(isSingleWord("")).toBe(false);
  });
});
