import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDuration,
  formatResetIn,
  formatTokens,
  percentLabel,
  providerName,
  severity,
  shownPercent,
  windowTitle,
} from "../../src/lib/format";

describe("format", () => {
  it("names known and unknown providers", () => {
    expect(providerName("claude")).toBe("Claude");
    expect(providerName("opencodego")).toBe("OpenCode Go");
    expect(providerName("newthing")).toBe("Newthing");
  });

  it("derives window titles from their length", () => {
    expect(windowTitle(300, "primary")).toBe("5-Hour Session");
    expect(windowTitle(10080, "Settimanale")).toBe("Weekly");
    expect(windowTitle(43200, "Session")).toBe("Monthly");
    expect(windowTitle(90, "Custom")).toBe("Custom");
    expect(windowTitle(undefined, "Custom")).toBe("Custom");
  });

  it("shows remaining or used percentages and clamps out-of-range values", () => {
    expect(shownPercent(2, "remaining")).toBe(98);
    expect(shownPercent(2, "used")).toBe(2);
    expect(shownPercent(140, "remaining")).toBe(0);
    expect(shownPercent(-5, "used")).toBe(0);
    expect(percentLabel(30, "remaining")).toBe("70% left");
    expect(percentLabel(30, "used")).toBe("30% used");
  });

  it("grades severity on what is left", () => {
    expect(severity(10)).toBe("ok");
    expect(severity(75)).toBe("warning");
    expect(severity(95)).toBe("critical");
    expect(severity(100)).toBe("exhausted");
  });

  it("formats durations compactly", () => {
    expect(formatDuration(30_000)).toBe("<1m");
    expect(formatDuration(12 * 60_000)).toBe("12m");
    expect(formatDuration((4 * 60 + 12) * 60_000)).toBe("4h 12m");
    expect(formatDuration(3 * 3_600_000)).toBe("3h");
    expect(formatDuration((6 * 24 + 11) * 3_600_000 + 59 * 60_000)).toBe("6d 11h");
    expect(formatDuration(2 * 86_400_000)).toBe("2d");
  });

  it("formats reset countdowns", () => {
    const now = new Date("2026-11-07T20:00:00Z");
    expect(formatResetIn(new Date("2026-11-07T22:30:00Z"), now)).toBe("Resets in 2h 30m");
    expect(formatResetIn(new Date("2026-11-07T19:00:00Z"), now)).toBe("Resetting now");
    expect(formatResetIn(undefined, now)).toBeUndefined();
  });

  it("formats money and tokens", () => {
    expect(formatCurrency(4.256)).toBe("$4.26");
    expect(formatCurrency(1234.5)).toBe("$1,235");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatTokens(950)).toBe("950");
    expect(formatTokens(12_340_000)).toBe("12.3M");
    expect(formatTokens(1_500_000_000)).toBe("1.5B");
    expect(formatTokens(123_456_789)).toBe("123M");
  });
});
