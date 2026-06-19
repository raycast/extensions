import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { extractDate, extractTime, formatDelta, formatRelative } from "../src/lib/format";

describe("formatDelta", () => {
  it("formats milliseconds", () => {
    expect(formatDelta(500)).toBe("+500ms");
    expect(formatDelta(-200)).toBe("-200ms");
  });

  it("formats seconds", () => {
    expect(formatDelta(2400)).toBe("+2.4s");
    expect(formatDelta(-5000)).toBe("-5.0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDelta(90_000)).toBe("+1m 30s");
    expect(formatDelta(60_000)).toBe("+1m");
  });

  it("formats hours and minutes", () => {
    expect(formatDelta(3_660_000)).toBe("+1h 1m");
    expect(formatDelta(3_600_000)).toBe("+1h");
  });
});

describe("formatRelative", () => {
  const FIXED_NOW = Date.UTC(2026, 3, 4, 18, 0, 0); // 2026-04-04T18:00:00Z

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('formats past times as "... ago"', () => {
    expect(formatRelative(FIXED_NOW - 30_000)).toBe("30s ago");
    expect(formatRelative(FIXED_NOW - 2 * 60_000 - 14_000)).toBe("2m 14s ago");
    expect(formatRelative(FIXED_NOW - 3_600_000 - 30 * 60_000)).toBe("1h 30m ago");
  });

  it('formats future times as "in ..."', () => {
    expect(formatRelative(FIXED_NOW + 45_000)).toBe("in 45s");
    expect(formatRelative(FIXED_NOW + 5 * 60_000)).toBe("in 5m");
  });

  it("formats day-level past and future", () => {
    expect(formatRelative(FIXED_NOW - 2 * 86_400_000)).toBe("2d ago");
    expect(formatRelative(FIXED_NOW - 2 * 86_400_000 - 3 * 3_600_000)).toBe("2d 3h ago");
    expect(formatRelative(FIXED_NOW + 3 * 86_400_000)).toBe("in 3d");
  });

  describe("coarse mode", () => {
    it('returns "just now" for sub-minute deltas', () => {
      expect(formatRelative(FIXED_NOW - 10_000, { coarse: true })).toBe("just now");
      expect(formatRelative(FIXED_NOW + 10_000, { coarse: true })).toBe("just now");
    });

    it("returns single-unit minutes and hours", () => {
      expect(formatRelative(FIXED_NOW - 5 * 60_000, { coarse: true })).toBe("5m ago");
      expect(formatRelative(FIXED_NOW - 3_600_000 - 30 * 60_000, { coarse: true })).toBe("1h ago");
      expect(formatRelative(FIXED_NOW + 7 * 60_000, { coarse: true })).toBe("in 7m");
    });

    it('returns "yesterday" / "tomorrow" for 1-day offsets', () => {
      expect(formatRelative(FIXED_NOW - 86_400_000, { coarse: true })).toBe("yesterday");
      expect(formatRelative(FIXED_NOW + 86_400_000, { coarse: true })).toBe("tomorrow");
    });

    it("returns day-level for multi-day offsets", () => {
      expect(formatRelative(FIXED_NOW - 5 * 86_400_000, { coarse: true })).toBe("5d ago");
      expect(formatRelative(FIXED_NOW + 3 * 86_400_000, { coarse: true })).toBe("in 3d");
    });
  });
});

describe("extractTime", () => {
  it("extracts HH:mm:ss.SSS from an ISO UTC string", () => {
    expect(extractTime("2026-04-04T18:02:31.123Z")).toBe("18:02:31.123");
  });

  it("extracts HH:mm:ss when fractional seconds are absent", () => {
    expect(extractTime("2026-04-04T18:02:31Z")).toBe("18:02:31");
  });

  it("falls back to the original string on mismatch", () => {
    expect(extractTime("not-an-iso")).toBe("not-an-iso");
  });
});

describe("extractDate", () => {
  it("extracts YYYY-MM-DD from an ISO string", () => {
    expect(extractDate("2026-04-04T18:02:31.123Z")).toBe("2026-04-04");
  });
});
