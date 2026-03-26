import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  calculateLeaveTime,
  calculateRemainingTime,
  formatTimeString,
} from "../src/lib/time-utils";

describe("formatTimeString", () => {
  test("pads single digit hours to two digits", () => {
    expect(formatTimeString(9, 0)).toBe("09:00");
    expect(formatTimeString(7, 5)).toBe("07:05");
  });

  test("keeps two digit hours as-is", () => {
    expect(formatTimeString(12, 30)).toBe("12:30");
    expect(formatTimeString(23, 59)).toBe("23:59");
  });

  test("handles midnight (0:00)", () => {
    expect(formatTimeString(0, 0)).toBe("00:00");
  });
});

describe("calculateLeaveTime", () => {
  // ===== Basic Patterns =====
  describe("basic daytime work", () => {
    test("9:00 start + 8h work + 60m break = 18:00 leave", () => {
      const result = calculateLeaveTime("09:00", 8, 60);
      expect(result).toBe("18:00");
    });

    test("10:30 start + 8h work + 60m break = 19:30 leave", () => {
      const result = calculateLeaveTime("10:30", 8, 60);
      expect(result).toBe("19:30");
    });

    test("7:00 start + 8h work + 60m break = 16:00 leave", () => {
      const result = calculateLeaveTime("07:00", 8, 60);
      expect(result).toBe("16:00");
    });

    test("8:30 start + 7.5h work + 45m break = 16:45 leave", () => {
      const result = calculateLeaveTime("08:30", 7.5, 45);
      expect(result).toBe("16:45");
    });
  });

  // ===== Overnight Shift Patterns =====
  describe("overnight shift (night work)", () => {
    test("22:00 start + 8h work + 60m break = 07:00 leave (next day)", () => {
      const result = calculateLeaveTime("22:00", 8, 60);
      expect(result).toBe("07:00");
    });

    test("19:00 start + 8h work + 60m break = 04:00 leave (next day)", () => {
      const result = calculateLeaveTime("19:00", 8, 60);
      expect(result).toBe("04:00");
    });

    test("21:00 start + 10h work + 60m break = 08:00 leave (next day)", () => {
      const result = calculateLeaveTime("21:00", 10, 60);
      expect(result).toBe("08:00");
    });

    test("23:00 start + 8h work + 60m break = 08:00 leave (next day)", () => {
      const result = calculateLeaveTime("23:00", 8, 60);
      expect(result).toBe("08:00");
    });

    test("20:00 start + 12h work + 120m break = 10:00 leave (next day)", () => {
      const result = calculateLeaveTime("20:00", 12, 120);
      expect(result).toBe("10:00");
    });

    test("18:00 start + 8h work + 60m break = 03:00 leave (next day)", () => {
      const result = calculateLeaveTime("18:00", 8, 60);
      expect(result).toBe("03:00");
    });
  });

  // ===== Boundary Value Tests =====
  describe("boundary values (around midnight)", () => {
    test("23:59 start + 8h work + 60m break = 08:59 leave (next day)", () => {
      const result = calculateLeaveTime("23:59", 8, 60);
      expect(result).toBe("08:59");
    });

    test("00:00 start + 8h work + 60m break = 09:00 leave (same day)", () => {
      const result = calculateLeaveTime("00:00", 8, 60);
      expect(result).toBe("09:00");
    });

    test("00:01 start + 8h work + 60m break = 09:01 leave (same day)", () => {
      const result = calculateLeaveTime("00:01", 8, 60);
      expect(result).toBe("09:01");
    });

    test("15:00 start + 8h work + 60m break = 00:00 leave (exactly midnight)", () => {
      const result = calculateLeaveTime("15:00", 8, 60);
      expect(result).toBe("00:00");
    });

    test("15:30 start + 8h work + 30m break = 00:00 leave (exactly midnight)", () => {
      const result = calculateLeaveTime("15:30", 8, 30);
      expect(result).toBe("00:00");
    });
  });

  // ===== Break Time Variations =====
  describe("break time variations", () => {
    test("no break: 9:00 start + 8h work + 0m break = 17:00 leave", () => {
      const result = calculateLeaveTime("09:00", 8, 0);
      expect(result).toBe("17:00");
    });

    test("15m break: 9:00 start + 8h work + 15m break = 17:15 leave", () => {
      const result = calculateLeaveTime("09:00", 8, 15);
      expect(result).toBe("17:15");
    });

    test("30m break: 9:00 start + 8h work + 30m break = 17:30 leave", () => {
      const result = calculateLeaveTime("09:00", 8, 30);
      expect(result).toBe("17:30");
    });

    test("45m break: 9:00 start + 8h work + 45m break = 17:45 leave", () => {
      const result = calculateLeaveTime("09:00", 8, 45);
      expect(result).toBe("17:45");
    });

    test("90m break: 9:00 start + 8h work + 90m break = 18:30 leave", () => {
      const result = calculateLeaveTime("09:00", 8, 90);
      expect(result).toBe("18:30");
    });

    test("120m break: 9:00 start + 8h work + 120m break = 19:00 leave", () => {
      const result = calculateLeaveTime("09:00", 8, 120);
      expect(result).toBe("19:00");
    });
  });

  // ===== Work Hours Variations =====
  describe("work hours variations", () => {
    test("short work: 9:00 start + 4h work + 30m break = 13:30 leave", () => {
      const result = calculateLeaveTime("09:00", 4, 30);
      expect(result).toBe("13:30");
    });

    test("6h work: 9:00 start + 6h work + 45m break = 15:45 leave", () => {
      const result = calculateLeaveTime("09:00", 6, 45);
      expect(result).toBe("15:45");
    });

    test("long work: 9:00 start + 12h work + 60m break = 22:00 leave", () => {
      const result = calculateLeaveTime("09:00", 12, 60);
      expect(result).toBe("22:00");
    });

    test("very long work: 6:00 start + 16h work + 90m break = 23:30 leave", () => {
      const result = calculateLeaveTime("06:00", 16, 90);
      expect(result).toBe("23:30");
    });

    test("24h+ work (rare case): 9:00 start + 24h work + 60m break = 10:00 leave (next day)", () => {
      const result = calculateLeaveTime("09:00", 24, 60);
      expect(result).toBe("10:00");
    });
  });

  // ===== Various Start Times =====
  describe("various start times", () => {
    test("early morning: 5:00 start + 8h work + 60m break = 14:00 leave", () => {
      const result = calculateLeaveTime("05:00", 8, 60);
      expect(result).toBe("14:00");
    });

    test("late night: 3:00 start + 8h work + 60m break = 12:00 leave", () => {
      const result = calculateLeaveTime("03:00", 8, 60);
      expect(result).toBe("12:00");
    });

    test("noon start: 12:00 start + 8h work + 60m break = 21:00 leave", () => {
      const result = calculateLeaveTime("12:00", 8, 60);
      expect(result).toBe("21:00");
    });

    test("afternoon start: 13:30 start + 8h work + 60m break = 22:30 leave", () => {
      const result = calculateLeaveTime("13:30", 8, 60);
      expect(result).toBe("22:30");
    });

    test("evening start: 17:00 start + 8h work + 60m break = 02:00 leave (next day)", () => {
      const result = calculateLeaveTime("17:00", 8, 60);
      expect(result).toBe("02:00");
    });
  });

  // ===== Decimal Work Hours =====
  describe("decimal work hours", () => {
    test("7.5h work: 9:00 start + 7.5h work + 60m break = 17:30 leave", () => {
      const result = calculateLeaveTime("09:00", 7.5, 60);
      expect(result).toBe("17:30");
    });

    test("6.25h work: 9:00 start + 6.25h work + 45m break = 16:00 leave", () => {
      const result = calculateLeaveTime("09:00", 6.25, 45);
      expect(result).toBe("16:00");
    });

    test("7.75h work: 10:00 start + 7.75h work + 60m break = 18:45 leave", () => {
      const result = calculateLeaveTime("10:00", 7.75, 60);
      expect(result).toBe("18:45");
    });
  });

  // ===== Minute Precision Tests =====
  describe("minute precision", () => {
    test("1 minute precision: 9:01 start + 8h work + 59m break = 18:00 leave", () => {
      const result = calculateLeaveTime("09:01", 8, 59);
      expect(result).toBe("18:00");
    });

    test("odd minutes: 9:17 start + 8h work + 43m break = 18:00 leave", () => {
      const result = calculateLeaveTime("09:17", 8, 43);
      expect(result).toBe("18:00");
    });

    test("complex combination: 10:23 start + 8h work + 67m break = 19:30 leave", () => {
      const result = calculateLeaveTime("10:23", 8, 67);
      expect(result).toBe("19:30");
    });
  });
});

describe("calculateRemainingTime - with mocked time", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("normal work: at 15:00, 3 hours until 18:00 leave", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 15, 0, 0)); // 15:00
    const result = calculateRemainingTime("18:00", "09:00");
    expect(result.hours).toBe(3);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(false);
  });

  test("after leave: at 19:00, 1 hour past 18:00 leave", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 19, 0, 0)); // 19:00
    const result = calculateRemainingTime("18:00", "09:00");
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(true);
  });

  test("night shift: at 20:00 (after start), 8 hours until 04:00 leave", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 20, 0, 0)); // 20:00 (after 19:00 start)
    const result = calculateRemainingTime("04:00", "19:00");
    expect(result.hours).toBe(8);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(false);
  });

  test("night shift late night: at 01:10, ~3 hours until 04:00 leave (no +24h)", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 1, 10, 0)); // 01:10 (late night)
    const result = calculateRemainingTime("04:00", "19:00");
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(50);
    expect(result.isPast).toBe(false);
  });

  test("night shift late night: at 05:00, 1 hour past 04:00 leave", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 5, 0, 0)); // 05:00 (after leave)
    const result = calculateRemainingTime("04:00", "19:00");
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(true);
  });

  test("without startTime, no overnight detection", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 1, 10, 0)); // 01:10
    const result = calculateRemainingTime("04:00", null);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(50);
    expect(result.isPast).toBe(false);
  });

  test("22:00 start -> 07:00 leave, at 23:00 is 8 hours remaining", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 23, 0, 0)); // 23:00
    const result = calculateRemainingTime("07:00", "22:00");
    expect(result.hours).toBe(8);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(false);
  });

  test("22:00 start -> 07:00 leave, at 03:00 is 4 hours remaining", () => {
    vi.setSystemTime(new Date(2026, 0, 17, 3, 0, 0)); // next day 03:00
    const result = calculateRemainingTime("07:00", "22:00");
    expect(result.hours).toBe(4);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(false);
  });

  test("22:00 start -> 06:00 leave, at 10:00 is 4 hours past", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 10, 0, 0)); // 10:00
    const result = calculateRemainingTime("06:00", "22:00");
    expect(result.hours).toBe(4);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(true);
  });

  test("22:00 start -> 06:00 leave, at 07:30 is 1h30m past", () => {
    vi.setSystemTime(new Date(2026, 0, 17, 7, 30, 0)); // next day 07:30
    const result = calculateRemainingTime("06:00", "22:00");
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(30);
    expect(result.isPast).toBe(true);
  });

  test("with currentTime input, ignores current seconds and keeps minute-aligned result", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 9, 0, 59)); // 09:00:59
    const result = calculateRemainingTime("18:00", "09:00", "09:00");
    expect(result.hours).toBe(9);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(false);
  });

  test("without currentTime input, rounds now down to minute precision", () => {
    vi.setSystemTime(new Date(2026, 0, 16, 9, 0, 59)); // 09:00:59
    const result = calculateRemainingTime("18:00", "09:00");
    expect(result.hours).toBe(9);
    expect(result.minutes).toBe(0);
    expect(result.isPast).toBe(false);
  });
});
