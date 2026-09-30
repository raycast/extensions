import { describe, it, expect, vi, afterEach } from "vitest";
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

    it("handles Sunday (day=0) when today is before Sunday", () => {
      // 2026-02-18 is Wednesday, base is Sunday
      mockToday("2026-02-18");
      const result = getNextOccurrence("2026-01-04", "weekly"); // Jan 4 2026 = Sunday
      expect(result.day()).toBe(0);
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-22");
    });

    it("handles Sunday (day=0) when today is Sunday", () => {
      // 2026-02-22 is Sunday
      mockToday("2026-02-22");
      const result = getNextOccurrence("2026-01-04", "weekly"); // Sunday
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-22");
    });

    it("crosses year boundary correctly", () => {
      // 2026-12-31 is Thursday, base is Tuesday
      mockToday("2026-12-31");
      const result = getNextOccurrence("2026-01-06", "weekly"); // Jan 6 2026 = Tuesday
      expect(result.day()).toBe(2);
      expect(result.format("YYYY-MM-DD")).toBe("2027-01-05");
    });
  });

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

    it("rolls from December to January of next year", () => {
      // Today is Dec 20, base day is 15 → this month (Dec 15) already passed → next is Jan 15
      mockToday("2026-12-20");
      const result = getNextOccurrence("2025-01-15", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2027-01-15");
    });

    it("returns December occurrence if day hasn't passed yet", () => {
      mockToday("2026-12-01");
      const result = getNextOccurrence("2025-01-15", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-12-15");
    });

    it("handles 1st of month correctly", () => {
      mockToday("2026-03-02");
      const result = getNextOccurrence("2025-01-01", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-04-01");
    });

    it("returns today when today is the 1st and base day is 1st", () => {
      mockToday("2026-03-01");
      const result = getNextOccurrence("2025-01-01", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-03-01");
    });

    it("rolls Jan 31 to Feb 28 via add(1, month) without overflow to Mar", () => {
      mockToday("2026-01-31");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-01-31");
    });

    it("after Jan 31 passes, next is Feb 28 not Mar 3", () => {
      mockToday("2026-02-01");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-02-28");
    });

    it("recovers from short month back to full day in longer month", () => {
      mockToday("2026-03-01");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-03-31");
    });

    it("returns today when today is month-end and base day exceeds it", () => {
      mockToday("2026-04-30");
      const result = getNextOccurrence("2025-01-31", "monthly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-04-30");
    });
  });

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

    it("returns this year's Dec 31 if it hasn't passed", () => {
      mockToday("2026-12-01");
      const result = getNextOccurrence("2020-12-31", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-12-31");
    });

    it("rolls to next year's Dec 31 if it has passed", () => {
      mockToday("2027-01-01");
      const result = getNextOccurrence("2020-12-31", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2027-12-31");
    });

    it("returns today when today is exactly Dec 31", () => {
      mockToday("2026-12-31");
      const result = getNextOccurrence("2020-12-31", "yearly");
      expect(result.format("YYYY-MM-DD")).toBe("2026-12-31");
    });
  });
});
