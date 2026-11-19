import { describe, expect, it } from "vitest";
import { keyCodes, returnKeyCode, shiftedKeyCodes, tabKeyCode } from "./keymap";
import { normalizeNewlines, planKeystrokes } from "./keystrokes";

describe("normalizeNewlines", () => {
  it("converts CRLF and lone CR to LF", () => {
    expect(normalizeNewlines("a\r\nb\rc\nd")).toBe("a\nb\nc\nd");
  });
});

describe("planKeystrokes", () => {
  const plan = (text: string, softNewlines = false) => planKeystrokes(text, { softNewlines });

  it("types unshifted and shifted characters with the same physical key", () => {
    expect(plan("a1A!")).toEqual([
      { keyCode: keyCodes.a, shift: false },
      { keyCode: keyCodes["1"], shift: false },
      { keyCode: keyCodes.a, shift: true },
      { keyCode: keyCodes["1"], shift: true },
    ]);
  });

  it("types newlines as Return, or Shift+Return with soft newlines", () => {
    expect(plan("\n")).toEqual([{ keyCode: returnKeyCode, shift: false }]);
    expect(plan("\n", true)).toEqual([{ keyCode: returnKeyCode, shift: true }]);
  });

  it("types tabs without Shift even with soft newlines", () => {
    expect(plan("\t", true)).toEqual([{ keyCode: tabKeyCode, shift: false }]);
  });

  it("falls back to text for characters without a key", () => {
    expect(plan("é")).toEqual([{ text: "é" }]);
  });

  it("plans one keystroke per code point, not per UTF-16 unit", () => {
    expect(plan("😀")).toEqual([{ text: "😀" }]);
  });
});

describe("keymap", () => {
  // Each shifted character is the Shift layer of an unshifted one, in US ANSI layout order.
  const pairs = ["aA", "zZ", "1!", "2@", "3#", "4$", "5%", "6^", "7&", "8*", "9(", "0)"]
    .concat(["-_", "=+", "[{", "]}", "\\|", ";:", `'"`, ",<", ".>", "/?", "`~"])
    .map(([plain, shifted]) => [plain, shifted] as const);

  it.each(pairs)("types %s and %s with the same key", (plain, shifted) => {
    expect(shiftedKeyCodes[shifted]).toBe(keyCodes[plain]);
  });

  it("maps every letter's capital to the same key", () => {
    for (const letter of "abcdefghijklmnopqrstuvwxyz") {
      expect(shiftedKeyCodes[letter.toUpperCase()]).toBe(keyCodes[letter]);
    }
  });

  it("doesn't assign one key code to two unshifted characters", () => {
    const codes = Object.values(keyCodes);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
