import { describe, expect, it } from "vitest";
import { ahvFromNumber, checkDigit, compactAhv, formatAhv, isValidAhv, randomAhv } from "./ahv";

describe("checkDigit", () => {
  it.each([
    ["756652357204", 0],
    ["756921707698", 5],
    ["756123456789", 7],
    ["756000000000", 2],
  ])("computes the EAN-13 check digit of %s as %s", (digits, expected) => {
    expect(checkDigit(digits)).toBe(expected);
  });
});

describe("ahvFromNumber", () => {
  it.each([
    [0, "7560000000002"],
    [652357204, "7566523572040"],
    [921707698, "7569217076985"],
    [999999999, "7569999999991"],
  ])("builds the number for %s", (value, expected) => {
    expect(ahvFromNumber(value)).toBe(expected);
  });

  it.each([-1, 1_000_000_000, 1.5])("rejects %s", (value) => {
    expect(() => ahvFromNumber(value)).toThrow();
  });
});

describe("randomAhv", () => {
  it("generates valid numbers", () => {
    for (let i = 0; i < 1000; i++) {
      const digits = randomAhv();
      expect(digits).toMatch(/^756\d{10}$/);
      expect(isValidAhv(digits)).toBe(true);
    }
  });
});

describe("formatAhv", () => {
  it("adds the dots", () => {
    expect(formatAhv("7569217076985")).toBe("756.9217.0769.85");
  });

  it("round-trips with compactAhv", () => {
    expect(compactAhv(formatAhv("7566523572040"))).toBe("7566523572040");
  });
});

describe("isValidAhv", () => {
  it.each(["756.9217.0769.85", "7569217076985", " 756.6523.5720.40 "])("accepts %j", (text) => {
    expect(isValidAhv(text)).toBe(true);
  });

  it.each([
    "756.9217.0769.84",
    "757.9217.0769.85",
    "756.9217.0769.8",
    "756-9217-0769-85",
    "756.92170769.85",
    "756921707698",
    "",
  ])("rejects %j", (text) => {
    expect(isValidAhv(text)).toBe(false);
  });
});
