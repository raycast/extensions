import { describe, it, expect } from "vitest";
import {
  formatAltitude,
  formatSpeed,
  formatHeading,
  formatEta,
  formatTime,
} from "./format";

describe("formatAltitude", () => {
  it("converts meters to feet with separator", () => {
    expect(formatAltitude(10668)).toBe("35,000 ft");
  });

  it("returns N/A for null", () => {
    expect(formatAltitude(null)).toBe("N/A");
  });

  it("handles zero altitude", () => {
    expect(formatAltitude(0)).toBe("0 ft");
  });
});

describe("formatSpeed", () => {
  it("converts m/s to knots", () => {
    // 250 m/s ≈ 486 knots
    expect(formatSpeed(250)).toBe("486 kts");
  });

  it("returns N/A for null", () => {
    expect(formatSpeed(null)).toBe("N/A");
  });

  it("handles zero speed", () => {
    expect(formatSpeed(0)).toBe("0 kts");
  });
});

describe("formatHeading", () => {
  it("formats degrees with degree symbol", () => {
    expect(formatHeading(267.3)).toBe("267\u00B0");
  });

  it("returns N/A for null", () => {
    expect(formatHeading(null)).toBe("N/A");
  });

  it("rounds to nearest integer", () => {
    expect(formatHeading(180.7)).toBe("181\u00B0");
  });
});

describe("formatEta", () => {
  it("formats hours and minutes", () => {
    expect(formatEta(2.25)).toBe("~2h 15m");
  });

  it("formats hours only when no minutes", () => {
    expect(formatEta(3.0)).toBe("~3h");
  });

  it("formats minutes only when less than 1 hour", () => {
    expect(formatEta(0.5)).toBe("~30m");
  });

  it("returns N/A for null", () => {
    expect(formatEta(null)).toBe("N/A");
  });

  it("clamps negative input to ~0m instead of rendering negative parts", () => {
    expect(formatEta(-1.5)).toBe("~0m");
  });
});

describe("formatTime", () => {
  it("formats date to locale time string", () => {
    const date = new Date("2024-01-23T14:45:00");
    const result = formatTime(date);
    // Format varies by locale, but should contain the time
    expect(result).toMatch(/2:45\s*PM/);
  });

  it("formats in a given timezone with a zone label", () => {
    // 19:00 UTC on 2024-06-01 = 3:00 PM EDT = 12:00 PM PDT.
    // Depending on ICU data, the label may be an abbreviation (EDT/PDT) or a
    // GMT offset (GMT-4/GMT-7) — accept either, but require the right zone.
    const utc = new Date("2024-06-01T19:00:00Z");
    expect(formatTime(utc, "America/New_York")).toMatch(
      /3:00\s*PM\s*(EDT|GMT-4)/,
    );
    expect(formatTime(utc, "America/Los_Angeles")).toMatch(
      /12:00\s*PM\s*(PDT|GMT-7)/,
    );
  });

  it("falls back to local formatting for an invalid timezone", () => {
    const utc = new Date("2024-06-01T19:00:00Z");
    expect(() => formatTime(utc, "Not/AZone")).not.toThrow();
    expect(formatTime(utc, "Not/AZone")).toMatch(/\d{1,2}:\d{2}\s*[AP]M/);
  });
});
