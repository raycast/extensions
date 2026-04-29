import { describe, it, expect } from "vitest";
import {
  ALL_GREEN_CODE,
  computePattern,
  computePatternCode,
  decodePattern,
  encodePattern,
  patternCodeToKey,
  patternToEmoji,
} from "./pattern";
import type { Pattern } from "./types";

const G = "gray" as const;
const Y = "yellow" as const;
const X = "green" as const;

describe("computePattern", () => {
  it("all green when guess equals answer", () => {
    expect(computePattern("crane", "crane")).toEqual([X, X, X, X, X]);
    expect(computePatternCode("crane", "crane")).toBe(ALL_GREEN_CODE);
    expect(ALL_GREEN_CODE).toBe(242);
  });

  it("all gray when no letters overlap", () => {
    expect(computePattern("crane", "boots")).toEqual([G, G, G, G, G]);
    expect(computePatternCode("crane", "boots")).toBe(0);
  });

  it("rotation produces all yellows", () => {
    expect(computePattern("eabcd", "abcde")).toEqual([Y, Y, Y, Y, Y]);
  });

  it("duplicate guess letters with single answer letter — only one is yellow", () => {
    expect(computePattern("speed", "abide")).toEqual([G, G, Y, G, Y]);
  });

  it("duplicate guess letters with green eats the count first", () => {
    expect(computePattern("allee", "eerie")).toEqual([G, G, G, Y, X]);
  });

  it("green consumes the single answer letter so duplicate guess letter stays gray", () => {
    expect(computePattern("books", "abode")).toEqual([Y, G, X, G, G]);
  });

  it("green consumes count so duplicate guess letter stays gray", () => {
    expect(computePattern("aabbb", "actor")).toEqual([X, G, G, G, G]);
  });

  it("guess letter present multiple times in answer can produce two yellows", () => {
    expect(computePattern("eexyz", "elope")).toEqual([X, Y, G, G, G]);
  });
});

describe("encodePattern / decodePattern", () => {
  it("roundtrips arbitrary patterns", () => {
    const cases: Pattern[] = [
      [G, G, G, G, G],
      [X, X, X, X, X],
      [Y, Y, Y, Y, Y],
      [G, Y, X, G, Y],
      [X, G, X, Y, G],
    ];
    for (const p of cases) {
      expect(decodePattern(encodePattern(p))).toEqual(p);
    }
  });

  it("encodes left-to-right with green=2, yellow=1, gray=0", () => {
    expect(encodePattern([G, G, G, G, G])).toBe(0);
    expect(encodePattern([X, X, X, X, X])).toBe(242);
    expect(encodePattern([Y, G, G, G, G])).toBe(81);
    expect(encodePattern([G, G, G, G, X])).toBe(2);
  });
});

describe("patternToEmoji", () => {
  it("renders the standard wordle squares left-to-right", () => {
    expect(patternToEmoji([G, Y, X, G, Y])).toBe("⬜🟨🟩⬜🟨");
    expect(patternToEmoji([X, X, X, X, X])).toBe("🟩🟩🟩🟩🟩");
  });
});

describe("patternCodeToKey", () => {
  it("zero-pads to a 5-char base-3 string", () => {
    expect(patternCodeToKey(0)).toBe("00000");
    expect(patternCodeToKey(242)).toBe("22222");
    expect(patternCodeToKey(encodePattern([G, G, Y, G, X]))).toBe("00102");
  });
});
