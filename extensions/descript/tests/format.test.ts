import { describe, expect, it } from "vitest";

import { formatDateTime, formatDuration, relativeTime } from "../src/lib/format";

describe("formatDuration", () => {
  it("returns undefined for missing or non-finite input", () => {
    expect(formatDuration(undefined)).toBeUndefined();
    expect(formatDuration(0)).toBeUndefined();
    expect(formatDuration(Number.NaN)).toBeUndefined();
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBeUndefined();
  });

  it("formats seconds, minutes, and hours", () => {
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(90)).toBe("1m 30s");
    expect(formatDuration(65)).toBe("1m 05s");
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(3 * 3600 + 25 * 60 + 59)).toBe("3h 25m");
  });

  it("rounds fractional seconds", () => {
    expect(formatDuration(59.6)).toBe("1m 00s");
    expect(formatDuration(1.2)).toBe("1s");
  });
});

describe("relativeTime", () => {
  it("returns undefined for missing or invalid input", () => {
    expect(relativeTime(undefined)).toBeUndefined();
    expect(relativeTime(null)).toBeUndefined();
    expect(relativeTime("not-a-date")).toBeUndefined();
  });

  it("treats anything within 30s as just now", () => {
    expect(relativeTime(new Date())).toBe("just now");
    expect(relativeTime(new Date(Date.now() - 10_000))).toBe("just now");
  });

  it("uses the largest fitting unit", () => {
    expect(relativeTime(new Date(Date.now() - 5 * 60_000))).toMatch(/minute/);
    expect(relativeTime(new Date(Date.now() - 3 * 60 * 60_000))).toMatch(/hour/);
    expect(relativeTime(new Date(Date.now() - 8 * 24 * 60 * 60_000))).toMatch(/week/);
  });
});

describe("formatDateTime", () => {
  it("returns undefined for missing or invalid input", () => {
    expect(formatDateTime(undefined)).toBeUndefined();
    expect(formatDateTime("garbage")).toBeUndefined();
  });

  it("formats a valid ISO timestamp", () => {
    expect(formatDateTime("2026-07-10T12:00:00Z")).toBeTruthy();
  });
});
