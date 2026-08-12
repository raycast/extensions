import { describe, expect, it } from "vitest";
import { scrambleText } from "../src/scramble-text";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function structure(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\p{L}/gu, "L")
    .replace(/\p{N}/gu, "N");
}

function separators(text: string): string[] {
  return text.normalize("NFD").replace(/\p{M}/gu, "").split(/\p{L}+|\p{N}+/gu);
}

describe("Draft text scrambler", () => {
  it("preserves layout structure and separators", () => {
    const source = "A quiet title\n\nDesign\twith soul — always.\nhello@example.com · 2026 ✦";
    const result = scrambleText(source, { random: seededRandom(1) });

    expect(structure(result)).toBe(structure(source));
    expect(separators(result)).toEqual(separators(source));
    expect(result).not.toBe(source);
  });

  it("maps repeated words consistently", () => {
    const words = scrambleText("Shape shape SHAPE", { random: seededRandom(3) }).split(" ");

    expect(words[0].toLowerCase()).toBe(words[1].toLowerCase());
    expect(words[1].toLowerCase()).toBe(words[2].toLowerCase());
  });

  it("handles canonically equivalent accented words safely in either order", () => {
    ["é e\u0301", "e\u0301 é"].forEach((source, index) => {
      const words = scrambleText(source, { random: seededRandom(32 + index) }).split(" ");

      expect(words[0].normalize("NFC")).toBe(words[1].normalize("NFC"));
      expect(structure(words.join(" "))).toBe(structure(source));
    });
  });

  it("scrambles decimal digits without changing their structure", () => {
    const source = "2026 / 03 / 14";
    const result = scrambleText(source, { random: seededRandom(4) });
    const sourceDigits = Array.from(source).filter((char) => /\p{N}/u.test(char));
    const resultDigits = Array.from(result).filter((char) => /\p{N}/u.test(char));

    expect(structure(result)).toBe(structure(source));
    expect(resultDigits.every((digit, index) => digit !== sourceDigits[index])).toBe(true);
  });

  it("leaves punctuation-only content untouched", () => {
    const source = "  — ✦\n\t…  ";

    expect(scrambleText(source, { random: seededRandom(9) })).toBe(source);
  });
});
