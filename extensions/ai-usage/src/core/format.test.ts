import { describe, expect, it } from "vitest";
import { formatCountdown, formatPercent, parseMinutes, parseThresholds, progressBar } from "./format";

const NOW = new Date("2026-07-27T15:40:00.000Z");

describe("progressBar", () => {
  it("renders proportional fill", () => {
    expect(progressBar(0, 10)).toBe("░░░░░░░░░░");
    expect(progressBar(100, 10)).toBe("██████████");
    expect(progressBar(50, 10)).toBe("█████░░░░░");
  });

  it("always renders exactly `width` characters", () => {
    for (const percent of [-20, 0, 0.4, 33.3, 99.6, 100, 250]) {
      expect([...progressBar(percent, 15)]).toHaveLength(15);
    }
  });

  it("shows a sliver for any non-zero usage, so 1% is not indistinguishable from 0%", () => {
    expect(progressBar(0, 15)).toBe("░".repeat(15));
    expect(progressBar(1, 15)).toBe("█" + "░".repeat(14));
  });

  it("holds back the last cell until genuinely full", () => {
    expect(progressBar(99.6, 15)).toBe("█".repeat(14) + "░");
    expect(progressBar(100, 15)).toBe("█".repeat(15));
  });
});

describe("formatPercent", () => {
  it("rounds to whole percentages", () => {
    expect(formatPercent(47.4)).toBe("47%");
    expect(formatPercent(0)).toBe("0%");
  });

  it("distinguishes 'barely used' from 'unused'", () => {
    expect(formatPercent(0.3)).toBe("<1%");
  });
});

describe("formatCountdown", () => {
  it("formats hours and minutes", () => {
    expect(formatCountdown(new Date(NOW.getTime() + 102 * 60_000), NOW)).toBe("1h 42m");
  });

  it("formats days for long windows", () => {
    expect(formatCountdown(new Date(NOW.getTime() + 50 * 3600_000), NOW)).toBe("2d 2h");
  });

  it("returns null once the moment has passed", () => {
    expect(formatCountdown(new Date(NOW.getTime() - 1), NOW)).toBeNull();
    expect(formatCountdown(null, NOW)).toBeNull();
  });
});

describe("parseThresholds", () => {
  const fallback = [50, 75];

  it("parses, sorts and de-duplicates", () => {
    expect(parseThresholds("90, 50,75, 50", fallback)).toEqual([50, 75, 90]);
  });

  it("drops values outside 0–100 instead of failing outright", () => {
    expect(parseThresholds("50, 150, -5, 80", fallback)).toEqual([50, 80]);
  });

  it("treats an empty field as a deliberate opt-out", () => {
    expect(parseThresholds("", fallback)).toEqual([]);
    expect(parseThresholds("   ", fallback)).toEqual([]);
  });

  it("falls back when the field is unparseable", () => {
    expect(parseThresholds("abc", fallback)).toEqual(fallback);
    expect(parseThresholds(undefined, fallback)).toEqual(fallback);
  });
});

describe("parseMinutes", () => {
  it("sorts descending so the earliest warning fires first", () => {
    expect(parseMinutes("10, 30", [30, 10])).toEqual([30, 10]);
  });

  it("rejects non-positive values", () => {
    expect(parseMinutes("0, -5, 15", [30])).toEqual([15]);
  });
});
