import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import moment from "moment";
import { getNextOccurrence } from "../utils";

// Helper to freeze "today" for deterministic tests
function mockToday(dateStr: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(dateStr));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("getNextOccurrence", () => {
  // ─── none / undefined ───────────────────────────────────
  describe("one-time (none)", () => {
    it("returns the original date as-is", () => {
      mockToday("2026-06-15");
      const result = getNextOccurrence("2025-01-10", "none");
      expect(result.format("YYYY-MM-DD")).toBe("2025-01-10");
    });

    it("returns the original date when repeat is undefined", () => {
      mockToday("2026-06-15");
      const result = getNextOccurrence("2025-01-10");
      expect(result.format("YYYY-MM-DD")).toBe("2025-01-10");
    });
  });

  // ─── weekly ─────────────────────────────────────────────
  describe("weekly", () => {
    it("returns this week's occurrence if it hasn't passed yet", () => {
      // 2026-02-16 is Monday, base is a Wednesday
      mockToday("2026-02-16");
      const result = getNextOccurrence("2026-01-07", "weekly"); // Jan 7 2026 = Wednesday
      expect(result.day()).toBe(3); // Wednesday
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-18");
    });

    it("returns next week's occurrence if this week's has passed", () => {
      // 2026-02-19 is Thursday, base is a Wednesday
      mockToday("2026-02-19");
      const result = getNextOccurrence("2026-01-07", "weekly"); // Wednesday
      expect(result.day()).toBe(3); // Wednesday
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-25");
    });

    it("returns today if today is the same day of week", () => {
      // 2026-02-18 is Wednesday
      mockToday("2026-02-18");
      const result = getNextOccurrence("2026-01-07", "weekly"); // Wednesday
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-18");
    });
  });

  // ─── monthly ────────────────────────────────────────────
  describe("monthly", () => {
    it("returns this month if the day hasn't passed", () => {
      mockToday("2026-03-01");
      const result = getNextOccurrence("2025-01-15", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-03-15");
    });

    it("returns next month if the day has passed", () => {
      mockToday("2026-03-20");
      const result = getNextOccurrence("2025-01-15", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-04-15");
    });

    it("returns today if today is the same day of month", () => {
      mockToday("2026-03-15");
      const result = getNextOccurrence("2025-01-15", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-03-15");
    });

    // ─── boundary: 31st in a 30-day month ─────────────────
    it("clamps 31st to 30th in a 30-day month (April)", () => {
      mockToday("2026-04-01");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-04-30");
    });

    it("clamps 31st to 28th in February (non-leap year)", () => {
      mockToday("2026-02-01");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-28");
    });

    it("clamps 31st to 29th in February (leap year)", () => {
      mockToday("2028-02-01");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2028-02-29");
    });

    it("clamps 30th to 28th in February (non-leap year)", () => {
      mockToday("2026-02-01");
      const result = getNextOccurrence("2025-01-30", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-28");
    });

    it("rolls to next month correctly when clamped day has passed", () => {
      // Today is Feb 28, base day is 31 → this month clamps to 28 → not before today → returns Feb 28
      mockToday("2026-02-28");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-28");
    });

    it("rolls to next month when past clamped day", () => {
      // Today is March 1, base day is 31 → this month = March 31 (valid) → future → returns March 31
      mockToday("2026-03-01");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-03-31");
    });
  });

  // ─── yearly ─────────────────────────────────────────────
  describe("yearly", () => {
    it("returns this year if the date hasn't passed", () => {
      mockToday("2026-01-01");
      const result = getNextOccurrence("2020-06-15", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-06-15");
    });

    it("returns next year if the date has passed", () => {
      mockToday("2026-08-01");
      const result = getNextOccurrence("2020-06-15", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2027-06-15");
    });

    it("returns today if today matches the yearly date", () => {
      mockToday("2026-06-15");
      const result = getNextOccurrence("2020-06-15", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-06-15");
    });

    // ─── boundary: Feb 29 (leap year birthday) ────────────
    it("clamps Feb 29 to Feb 28 in a non-leap year", () => {
      mockToday("2026-01-01");
      const result = getNextOccurrence("2024-02-29", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-28");
    });

    it("preserves Feb 29 in a leap year", () => {
      mockToday("2028-01-01");
      const result = getNextOccurrence("2024-02-29", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2028-02-29");
    });

    it("clamps Feb 29 to Feb 28 when rolling to next non-leap year", () => {
      mockToday("2026-03-01");
      const result = getNextOccurrence("2024-02-29", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2027-02-28");
    });
  });
});
