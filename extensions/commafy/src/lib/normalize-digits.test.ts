import { describe, expect, it } from "vitest";
import { normalizeDigits } from "./normalize-digits";

describe("normalizeDigits() — digits", () => {
  it("converts full-width digits to half-width", () => {
    expect(normalizeDigits("１２３").text).toBe("123");
    expect(normalizeDigits("０１２３４５６７８９").text).toBe("0123456789");
  });

  it("leaves non-target characters untouched", () => {
    expect(normalizeDigits("こんにちは").text).toBe("こんにちは");
    expect(normalizeDigits("ABC１２３xyz").text).toBe("ABC123xyz");
    expect(normalizeDigits("価格は１２３４円").text).toBe("価格は1234円");
  });

  it("counts the characters it converted", () => {
    expect(normalizeDigits("１２３").count).toBe(3);
    expect(normalizeDigits("123").count).toBe(0);
    expect(normalizeDigits("１２３abc４５").count).toBe(5);
  });

  it("does not touch already half-width digits", () => {
    expect(normalizeDigits("123 ABC").text).toBe("123 ABC");
  });
});

describe("normalizeDigits() — punctuation", () => {
  it("converts full-width numeric punctuation to half-width", () => {
    expect(normalizeDigits("１２３４．５６").text).toBe("1234.56");
    expect(normalizeDigits("１，２３４").text).toBe("1,234");
    expect(normalizeDigits("－１２３").text).toBe("-123");
    expect(normalizeDigits("＋１２３").text).toBe("+123");
    expect(normalizeDigits("２０２６／０５／１８").text).toBe("2026/05/18");
  });

  it("converts the standalone MINUS SIGN (U+2212)", () => {
    expect(normalizeDigits("−1234").text).toBe("-1234");
  });

  it("counts every converted character (digits + punctuation)", () => {
    expect(normalizeDigits("１，２３４．５").count).toBe(7);
  });
});
