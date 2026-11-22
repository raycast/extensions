import { describe, expect, it } from "vitest";
import {
  clampPercent,
  cocoaDate,
  formatCurrency,
  formatDuration,
  formatResetIn,
  percentLabel,
  severity,
  shownPercent,
} from "../../src/lib/format";

describe("format", () => {
  it("converts Swift dates counted from 2001-01-01", () => {
    expect(cocoaDate(0.5)?.toISOString()).toBe("2001-01-01T00:00:00.500Z");
    expect(cocoaDate(816017754)?.toISOString()).toBe("2026-11-10T15:35:54.000Z");
  });

  it("rejects missing or meaningless dates", () => {
    expect(cocoaDate(undefined)).toBeUndefined();
    expect(cocoaDate("816017754")).toBeUndefined();
    expect(cocoaDate(0)).toBeUndefined();
    expect(cocoaDate(Number.NaN)).toBeUndefined();
  });

  it("shows remaining or used percentages and clamps out-of-range values", () => {
    expect(shownPercent(18, "remaining")).toBe(82);
    expect(shownPercent(18, "used")).toBe(18);
    expect(percentLabel(18, "remaining")).toBe("82% left");
    expect(percentLabel(140, "used")).toBe("100% used");
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
  });

  it("grades severity on what is left", () => {
    expect(severity(10)).toBe("ok");
    expect(severity(70)).toBe("warning");
    expect(severity(90)).toBe("critical");
    expect(severity(100)).toBe("exhausted");
  });

  it("formats durations compactly", () => {
    expect(formatDuration(30_000)).toBe("<1m");
    expect(formatDuration(12 * 60_000)).toBe("12m");
    expect(formatDuration(4 * 3_600_000 + 12 * 60_000)).toBe("4h 12m");
    expect(formatDuration(6 * 86_400_000 + 11 * 3_600_000)).toBe("6d 11h");
    expect(formatDuration(2 * 86_400_000)).toBe("2d");
  });

  it("formats reset countdowns", () => {
    const now = new Date("2026-11-10T12:00:00Z");
    expect(formatResetIn(undefined, now)).toBeUndefined();
    expect(formatResetIn(new Date("2026-11-10T14:30:00Z"), now)).toBe("Resets in 2h 30m");
    expect(formatResetIn(new Date("2026-11-10T11:00:00Z"), now)).toBe("Resetting now");
  });

  it("formats money in the profile currency", () => {
    expect(formatCurrency(12.5, "EUR")).toBe("€12.50");
    expect(formatCurrency(250, "USD")).toBe("$250");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatCurrency(3, "not-a-currency")).toBe("3.00 not-a-currency");
  });
});
