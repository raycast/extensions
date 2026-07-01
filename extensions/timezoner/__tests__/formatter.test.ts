import { describe, it, expect } from "vitest";
import { formatTime, formatDate, formatForCopy, buildReferenceDate } from "../src/formatter";

// Fixed date: 2026-03-25 15:00 UTC
const refDate = new Date("2026-03-25T15:00:00Z");

describe("formatTime", () => {
  it("formats in 12h mode", () => {
    const result = formatTime(refDate, "America/Los_Angeles", "12h");
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/);
  });

  it("formats in 24h mode", () => {
    const result = formatTime(refDate, "America/Los_Angeles", "24h");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
    expect(result).not.toMatch(/AM|PM/);
  });
});

describe("formatDate", () => {
  it("returns day and date", () => {
    const result = formatDate(refDate, "America/New_York");
    expect(result).toMatch(/\w{3}, \w{3} \d{1,2}/);
  });
});

describe("formatForCopy", () => {
  it("formats time-tz style", () => {
    const result = formatForCopy(refDate, "America/Los_Angeles", "SF", "12h", "time-tz");
    expect(result).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)\s+\w+/);
  });

  it("formats time-city style", () => {
    const result = formatForCopy(refDate, "America/Los_Angeles", "SF", "12h", "time-city");
    expect(result).toContain("(SF)");
  });

  it("formats 24h-tz style", () => {
    const result = formatForCopy(refDate, "America/Los_Angeles", "SF", "24h", "24h-tz");
    expect(result).toMatch(/\d{1,2}:\d{2}\s+\w+/);
    expect(result).not.toMatch(/AM|PM/);
  });
});

describe("buildReferenceDate", () => {
  it("creates a date at the specified time in the given timezone", () => {
    const date = buildReferenceDate(15, 0, "America/Los_Angeles");
    const check = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    expect(check).toBe("15:00");
  });

  it("handles midnight", () => {
    const date = buildReferenceDate(0, 0, "Asia/Tokyo");
    const check = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    expect(check).toMatch(/^0?0:00$/);
  });

  it("handles fractional-offset timezone (UTC+5:45)", () => {
    const date = buildReferenceDate(14, 30, "Asia/Kathmandu");
    const check = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kathmandu",
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    expect(check).toBe("14:30");
  });
});
