import { describe, it, expect } from "vitest";
import { coerceNumber, resolvePreferences } from "./preferences";

describe("coerceNumber", () => {
  it("passes through a valid integer string", () => {
    expect(coerceNumber("50", 50, 0)).toBe(50);
  });

  it("falls back when input is NaN (non-numeric)", () => {
    expect(coerceNumber("abc", 50, 0)).toBe(50);
  });

  it("falls back when empty string is below floor (floor > 0)", () => {
    // Number("") === 0, which is below floor=1 → fallback
    expect(coerceNumber("", 10, 1)).toBe(10);
  });

  it("falls back when input is below floor (negative)", () => {
    expect(coerceNumber("-5", 50, 0)).toBe(50);
  });

  it("floors a positive decimal", () => {
    expect(coerceNumber("7.9", 10, 1)).toBe(7);
  });

  it("falls back when input is non-finite (Infinity)", () => {
    expect(coerceNumber("Infinity", 50, 0)).toBe(50);
  });
});

describe("resolvePreferences", () => {
  it("returns the full ResolvedPrefs shape on a happy path", () => {
    const raw: Preferences = {
      browser: undefined,
      openDelayMs: "100",
      openAnyUriType: true,
      confirmEnabled: true,
      confirmThreshold: "20",
    };
    expect(resolvePreferences(raw)).toEqual({
      browser: undefined,
      delayMs: 100,
      openAnyUriType: true,
      confirmEnabled: true,
      confirmThreshold: 20,
    });
  });
});
