import { describe, expect, it } from "vitest";
import { lowercase, oneLine, sentenceCase, titleCase, trimWhitespace, uppercase } from "../src/transforms";

describe("case conversions", () => {
  it("lowercases Unicode while retaining layout and punctuation", () => {
    expect(lowercase("  HÉLLO\tWORLD!\r\nÉCOLE — ΑΘΉΝΑ 😀  ")).toBe("  héllo\tworld!\r\nécole — αθήνα 😀  ");
  });

  it("uppercases Unicode, including expansions", () => {
    expect(uppercase("  Straße\tété\nhello 😀 ")).toBe("  STRASSE\tÉTÉ\nHELLO 😀 ");
  });

  it("capitalizes words without breaking apostrophes or combining accents", () => {
    expect(titleCase("DON'T STOP — IT’S A WELL-KNOWN CAFÉ, E\u0301COLE!")).toBe(
      "Don't Stop — It’s A Well-Known Café, E\u0301cole!",
    );
  });

  it("uses simple title case, including small words, and retains whitespace", () => {
    expect(titleCase("  the LORD\tof THE rings\r\npart TWO  ")).toBe("  The Lord\tOf The Rings\r\nPart Two  ");
  });

  it("capitalizes sentence beginnings and preserves quoted punctuation", () => {
    expect(sentenceCase('“HELLO WORLD!” HOW ARE YOU? "FINE." THANK YOU.')).toBe(
      '“Hello world!” How are you? "Fine." Thank you.',
    );
  });

  it("recognizes lines and keeps indentation, numbers, and emoji", () => {
    expect(sentenceCase("  1. HELLO\r\n\t2. WORLD\n😀 ÉCOLE\u2028NEXT\u2029LAST")).toBe(
      "  1. Hello\r\n\t2. World\n😀 École\u2028Next\u2029Last",
    );
  });

  it("does not treat decimal points, domains, or unspaced punctuation as sentence breaks", () => {
    expect(sentenceCase("PAY 3.50 AT EXAMPLE.COM. NEXT!NO SPACE")).toBe("Pay 3.50 at example.com. Next!no space");
  });

  it("documents the simple sentence rule for names and abbreviations", () => {
    expect(sentenceCase("NASA MET DR. SMITH IN LONDON.")).toBe("Nasa met dr. Smith in london.");
  });

  it.each([lowercase, uppercase, titleCase, sentenceCase])("retains empty and non-letter text (%#)", (transform) => {
    for (const text of ["", " \t\r\n ", "123 — 😀!?", "你好 世界"]) {
      expect(transform(text)).toBe(text);
    }
  });
});

describe("whitespace cleanup", () => {
  it("trims outer whitespace while preserving interior layout and case", () => {
    expect(trimWhitespace("\u00a0\t\r\n Hello  WORLD\n\tKeep this! \u2003")).toBe("Hello  WORLD\n\tKeep this!");
  });

  it("joins lines and collapses whitespace without changing words, case, or punctuation", () => {
    expect(oneLine(" \tHÉLLO  World!\r\n\r\nDON'T\tSTOP\rNext\u2028line\u2029here\u00a0😀\n")).toBe(
      "HÉLLO World! DON'T STOP Next line here 😀",
    );
  });
});
