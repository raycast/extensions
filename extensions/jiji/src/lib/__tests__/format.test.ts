import { describe, expect, it } from "vitest";
import { formatLastUpdated, formatPercent, formatReset, resetDuration } from "../format";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const plus = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatPercent", () => {
  it("renders a rounded percent", () => {
    expect(formatPercent(33.4)).toBe("33%");
    expect(formatPercent(33.6)).toBe("34%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(100)).toBe("100%");
  });

  it("renders an em dash when unknown", () => {
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatReset", () => {
  it("returns null for missing or unparseable timestamps", () => {
    expect(formatReset(null, NOW)).toBeNull();
    expect(formatReset("not-a-date", NOW)).toBeNull();
  });

  it("says 'Resets soon' when elapsed or under a minute away", () => {
    expect(formatReset(plus(-HOUR), NOW)).toBe("Resets soon");
    expect(formatReset(plus(30_000), NOW)).toBe("Resets soon");
    expect(formatReset(plus(MIN), NOW)).toBe("Resets soon"); // exactly 60s → soon
  });

  it("formats minute, hour, and day granularities", () => {
    expect(formatReset(plus(61_000), NOW)).toBe("Resets in 1m");
    expect(formatReset(plus(45 * MIN), NOW)).toBe("Resets in 45m");
    expect(formatReset(plus(HOUR), NOW)).toBe("Resets in 1h");
    expect(formatReset(plus(HOUR + 30 * MIN), NOW)).toBe("Resets in 1h 30m");
    expect(formatReset(plus(3 * HOUR + 12 * MIN), NOW)).toBe("Resets in 3h 12m");
    expect(formatReset(plus(2 * DAY), NOW)).toBe("Resets in 2d");
    expect(formatReset(plus(2 * DAY + 5 * HOUR), NOW)).toBe("Resets in 2d 5h");
  });
});

describe("resetDuration", () => {
  it("returns compact durations, 'soon', or null", () => {
    expect(resetDuration(null, NOW)).toBeNull();
    expect(resetDuration("not-a-date", NOW)).toBeNull();
    expect(resetDuration(plus(30_000), NOW)).toBe("soon");
    expect(resetDuration(plus(45 * MIN), NOW)).toBe("45m");
    expect(resetDuration(plus(3 * HOUR + 12 * MIN), NOW)).toBe("3h 12m");
    expect(resetDuration(plus(2 * DAY + 5 * HOUR), NOW)).toBe("2d 5h");
  });
});

describe("formatLastUpdated", () => {
  it("handles never / just now / minutes / hours / days", () => {
    expect(formatLastUpdated(null, NOW)).toBe("never");
    expect(formatLastUpdated(new Date(NOW.getTime() - 30_000), NOW)).toBe("just now");
    expect(formatLastUpdated(new Date(NOW.getTime() - 5 * MIN), NOW)).toBe("5m ago");
    expect(formatLastUpdated(new Date(NOW.getTime() - 3 * HOUR), NOW)).toBe("3h ago");
    expect(formatLastUpdated(new Date(NOW.getTime() - 2 * DAY), NOW)).toBe("2d ago");
  });
});
