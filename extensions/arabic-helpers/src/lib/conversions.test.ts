import { describe, expect, it } from "vitest";
import {
  containsArabicHarakat,
  deriveHarakatPair,
  detectFirstNumeralSystem,
  isValidHarakatResult,
  stripArabicHarakat,
  toArabicIndicNumerals,
  toWesternNumerals,
  updatePlainTextPreservingHarakat,
} from "./conversions";

describe("numeral conversion", () => {
  it("converts Western digits inside Arabic text", () => {
    expect(toArabicIndicNumerals("لدي 3 كتب في 2 حقائب")).toBe("لدي ٣ كتب في ٢ حقائب");
  });

  it("converts Arabic-Indic digits inside multiline text", () => {
    expect(toWesternNumerals("السطر ١\nالسطر ٢")).toBe("السطر 1\nالسطر 2");
  });

  it("canonicalizes mixed numeral systems in the target output", () => {
    expect(toArabicIndicNumerals("1٢3")).toBe("١٢٣");
    expect(toWesternNumerals("1٢3")).toBe("123");
  });

  it("preserves punctuation, whitespace, and digit-free text", () => {
    const text = "مرحبًا، يا عالم!\n";
    expect(toArabicIndicNumerals(text)).toBe(text);
    expect(toWesternNumerals(text)).toBe(text);
  });

  it("detects the first numeral rather than requiring the text to start with one", () => {
    expect(detectFirstNumeralSystem("الناتج 12 ثم ٣")).toBe("western");
    expect(detectFirstNumeralSystem("الناتج ١٢ ثم 3")).toBe("arabic-indic");
    expect(detectFirstNumeralSystem("لا توجد أرقام")).toBeUndefined();
  });
});

describe("Arabic harakat", () => {
  it("removes Arabic harakat and normalizes alif wasla", () => {
    expect(stripArabicHarakat("بِسْمِ ٱللَّهِ الرَّحْمَنِ الرَّحِيمِ")).toBe("بسم الله الرحمن الرحيم");
  });

  it("removes Quranic Arabic combining marks", () => {
    expect(stripArabicHarakat("مِنۢ بَعْدِ")).toBe("من بعد");
  });

  it("preserves combining marks from other scripts", () => {
    const decomposedLatin = "cafe\u0301";
    expect(stripArabicHarakat(decomposedLatin)).toBe(decomposedLatin);
  });

  it("detects only Arabic combining marks as harakat", () => {
    expect(containsArabicHarakat("مَرْحَبًا")).toBe(true);
    expect(containsArabicHarakat("cafe\u0301")).toBe(false);
    expect(containsArabicHarakat("مرحبا")).toBe(false);
  });

  it("preserves the marked source when the plain field changes", () => {
    const original = deriveHarakatPair("بِسْمِ اللَّهِ");
    const updated = updatePlainTextPreservingHarakat(original, "نص جديد");

    expect(updated.withHarakat).toBe("بِسْمِ اللَّهِ");
    expect(updated.withoutHarakat).toBe("نص جديد");
  });
});

describe("AI harakat validation", () => {
  it("accepts output that differs only by Arabic marks", () => {
    expect(isValidHarakatResult("بسم الله", "بِسْمِ اللَّهِ")).toBe(true);
  });

  it("rejects changed wording, whitespace, wrappers, and empty output", () => {
    expect(isValidHarakatResult("بسم الله", "بِاسْمِ اللَّهِ")).toBe(false);
    expect(isValidHarakatResult("بسم الله", "بِسْمِ  اللَّهِ")).toBe(false);
    expect(isValidHarakatResult("بسم الله", "**بِسْمِ اللَّهِ**")).toBe(false);
    expect(isValidHarakatResult("بسم الله", "")).toBe(false);
  });
});
