import { describe, expect, it } from "vitest";
import { transformText } from "../src/transform";

describe("text styles", () => {
  it("preserves the original alternating colors and letter case", () => {
    expect(transformText("Abc")).toBe(":alphabet-yellow-A::alphabet-white-b::alphabet-yellow-c:");
  });
  it("triples spaces and counts punctuation in color positions", () => {
    expect(transformText("a !b")).toBe(":alphabet-yellow-a:   !:alphabet-white-b:");
  });
  it("preserves Unicode, line breaks, and the original UTF-16 color positions", () => {
    expect(transformText("🫶ß\nb")).toBe("🫶ß\n:alphabet-yellow-b:");
  });
  it("maps Vietnamese letters to telex emoji names, composed or decomposed", () => {
    expect(transformText("nhậu đi")).toBe(
      ":alphabet-yellow-n::alphabet-white-h::alphabet-yellow-aaj::alphabet-white-u:   :alphabet-white-dd::alphabet-yellow-i:",
    );
    expect(transformText("Ợ ă ế".normalize("NFD"))).toBe(
      ":alphabet-yellow-owj:   :alphabet-yellow-aw:   :alphabet-white-ees:",
    );
    expect(transformText("ç")).toBe("ç");
  });
  it.each(["K", "ç", "ñ", "î", "û", "ĉ", "ĝ", "ŝ", "ǹ", "a\u031b", "e\u0306", "a\u0302\u0306", "a\u0301\u0300"])(
    "preserves unsupported alphabet glyph %s verbatim",
    (glyph) => {
      expect(transformText(glyph)).toBe(glyph);
    },
  );
  it.each([
    ["ă", "aw"],
    ["â", "aa"],
    ["ê", "ee"],
    ["ô", "oo"],
    ["ơ", "ow"],
    ["ư", "uw"],
    ["í", "is"],
    ["ỹ", "yx"],
    ["Đ", "dd"],
  ])("retains valid Vietnamese glyph %s across case and normalization", (glyph, name) => {
    for (const input of [glyph, glyph.toUpperCase()]) {
      expect(transformText(input.normalize("NFC"))).toBe(`:alphabet-yellow-${name}:`);
      expect(transformText(input.normalize("NFD"))).toBe(`:alphabet-yellow-${name}:`);
    }
  });
  it("keeps repeated and edge spaces", () => {
    expect(transformText("  a ")).toBe("      :alphabet-yellow-a:   ");
  });
  it("makes a multiline ASCII-only banner", () => {
    const result = transformText("Cool", "ascii");
    expect(result.split("\n").length).toBeGreaterThan(1);
    expect(result).toMatch(/^[\x20-\x7e\r\n]+$/);
    expect(result).toContain("_");
  });
  it("rejects unsupported banner characters instead of silently dropping them", () => {
    expect(() => transformText("café 🫶", "ascii")).toThrow("ASCII banners support");
  });
  it("rejects unknown styles", () => {
    expect(() => transformText("hello", "missing")).toThrow("Unknown style");
  });
});

for (const font of ["Small", "Standard", "Slant", "Big"]) {
  it(`wraps ${font} banners without trailing whitespace`, () => {
    const output = transformText("Hello world this is a longer sentence", "ascii", font);
    expect(output.split("\n").every((line) => line.length <= 60)).toBe(true);
    expect(output.split("\n").every((line) => line === line.trimEnd())).toBe(true);
    expect(output.trim()).not.toBe("");
  });
}
