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
    expect(transformText("🫶é\nb")).toBe("🫶é\n:alphabet-yellow-b:");
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
