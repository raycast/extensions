import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatTime,
  formatNumber,
  parseCounterFormat,
  formatSize,
  formatDuration,
  generateRandom,
  generateUUID,
  detectFormatType,
} from "../lib/template/formatters";

// Fixed date: January 15, 2024 at 14:30:45
const testDate = new Date(2024, 0, 15, 14, 30, 45);

describe("formatDate", () => {
  it("should format with default format YYYY-MM-DD", () => {
    expect(formatDate(testDate)).toBe("2024-01-15");
  });

  it("should format with custom format DD/MM/YYYY", () => {
    expect(formatDate(testDate, "DD/MM/YYYY")).toBe("15/01/2024");
  });

  it("should handle single-digit tokens M and D", () => {
    expect(formatDate(testDate, "M")).toBe("1");
    expect(formatDate(testDate, "D")).toBe("15");

    // Use a date with single-digit day
    const singleDigitDay = new Date(2024, 0, 5, 0, 0, 0);
    expect(formatDate(singleDigitDay, "D")).toBe("5");
    expect(formatDate(singleDigitDay, "DD")).toBe("05");
  });

  it("should format two-digit year with YY", () => {
    expect(formatDate(testDate, "YY")).toBe("24");
  });

  it("should handle combined custom format with all tokens", () => {
    expect(formatDate(testDate, "YY-M-D")).toBe("24-1-15");
  });
});

describe("formatTime", () => {
  it("should format with default format HH-mm-ss", () => {
    expect(formatTime(testDate)).toBe("14-30-45");
  });

  it("should format 12-hour clock with hh", () => {
    expect(formatTime(testDate, "hh")).toBe("02");
  });

  it("should format AM/PM with uppercase A", () => {
    expect(formatTime(testDate, "hh:mm A")).toBe("02:30 PM");

    const morningDate = new Date(2024, 0, 15, 9, 5, 3);
    expect(formatTime(morningDate, "hh:mm A")).toBe("09:05 AM");
  });

  it("should format am/pm with lowercase a", () => {
    expect(formatTime(testDate, "hh:mm a")).toBe("02:30 pm");
  });

  it("should format single-digit tokens H, h, m, s", () => {
    const morningDate = new Date(2024, 0, 15, 9, 5, 3);
    expect(formatTime(morningDate, "H")).toBe("9");
    expect(formatTime(morningDate, "h")).toBe("9");
    expect(formatTime(morningDate, "m")).toBe("5");
    expect(formatTime(morningDate, "s")).toBe("3");
  });

  it("should handle noon (12:00) correctly", () => {
    const noon = new Date(2024, 0, 15, 12, 0, 0);
    expect(formatTime(noon, "HH")).toBe("12");
    expect(formatTime(noon, "hh")).toBe("12");
    expect(formatTime(noon, "A")).toBe("PM");
    expect(formatTime(noon, "h")).toBe("12");
  });

  it("should handle midnight (00:00) correctly", () => {
    const midnight = new Date(2024, 0, 15, 0, 0, 0);
    expect(formatTime(midnight, "HH")).toBe("00");
    expect(formatTime(midnight, "H")).toBe("0");
    // 0 % 12 || 12 = 12, so midnight in 12-hour is 12
    expect(formatTime(midnight, "hh")).toBe("12");
    expect(formatTime(midnight, "h")).toBe("12");
    expect(formatTime(midnight, "A")).toBe("AM");
  });
});

describe("formatNumber", () => {
  it("should return plain number string when no format is provided", () => {
    expect(formatNumber(5)).toBe("5");
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(0)).toBe("0");
  });

  it("should pad to 3 digits with format '001'", () => {
    expect(formatNumber(5, "001")).toBe("005");
    expect(formatNumber(42, "001")).toBe("042");
  });

  it("should pad to 4 digits with format '0001'", () => {
    expect(formatNumber(5, "0001")).toBe("0005");
    expect(formatNumber(42, "0001")).toBe("0042");
  });

  it("should not truncate numbers larger than padding", () => {
    expect(formatNumber(123, "00")).toBe("123");
    expect(formatNumber(12345, "001")).toBe("12345");
  });
});

describe("parseCounterFormat", () => {
  it("should return the length of the format string", () => {
    expect(parseCounterFormat("001")).toBe(3);
    expect(parseCounterFormat("0001")).toBe(4);
    expect(parseCounterFormat("00")).toBe(2);
  });

  it("should return 1 when format is undefined", () => {
    expect(parseCounterFormat()).toBe(1);
    expect(parseCounterFormat(undefined)).toBe(1);
  });
});

describe("formatSize", () => {
  it("should return '0 B' for 0 bytes", () => {
    expect(formatSize(0)).toBe("0 B");
  });

  it("should format bytes", () => {
    expect(formatSize(500)).toBe("500.0 B");
  });

  it("should format kilobytes", () => {
    expect(formatSize(1024)).toBe("1.0 KB");
    expect(formatSize(1536)).toBe("1.5 KB");
  });

  it("should format megabytes", () => {
    expect(formatSize(1048576)).toBe("1.0 MB");
    expect(formatSize(1572864)).toBe("1.5 MB");
  });

  it("should format gigabytes", () => {
    expect(formatSize(1073741824)).toBe("1.0 GB");
  });

  it("should respect custom decimals", () => {
    expect(formatSize(1536, 2)).toBe("1.50 KB");
    expect(formatSize(1536, 0)).toBe("2 KB");
  });
});

describe("formatDuration", () => {
  it("should format seconds only", () => {
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(59)).toBe("59s");
  });

  it("should format minutes and seconds", () => {
    expect(formatDuration(330)).toBe("5m 30s");
    expect(formatDuration(60)).toBe("1m");
  });

  it("should format hours, minutes, and seconds", () => {
    expect(formatDuration(5445)).toBe("1h 30m 45s");
    expect(formatDuration(3661)).toBe("1h 1m 1s");
  });

  it("should return '0s' for negative seconds", () => {
    expect(formatDuration(-1)).toBe("0s");
    expect(formatDuration(-100)).toBe("0s");
  });

  it("should return '0s' for 0 seconds", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});

describe("generateRandom", () => {
  it("should generate a string of default length 6", () => {
    const result = generateRandom();
    expect(result).toHaveLength(6);
  });

  it("should generate a string of custom length", () => {
    expect(generateRandom(10)).toHaveLength(10);
    expect(generateRandom(1)).toHaveLength(1);
    expect(generateRandom(20)).toHaveLength(20);
  });

  it("should contain only alphanumeric lowercase characters", () => {
    // Run multiple times to increase confidence
    for (let i = 0; i < 50; i++) {
      const result = generateRandom(20);
      expect(result).toMatch(/^[a-z0-9]+$/);
    }
  });
});

describe("generateUUID", () => {
  it("should match UUID v4 pattern", () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("should always have '4' at position 14", () => {
    for (let i = 0; i < 20; i++) {
      const uuid = generateUUID();
      expect(uuid[14]).toBe("4");
    }
  });
});

describe("detectFormatType", () => {
  it("should detect date format", () => {
    expect(detectFormatType("YYYY-MM-DD")).toBe("date");
    expect(detectFormatType("DD/MM/YYYY")).toBe("date");
    expect(detectFormatType("YY.MM.DD")).toBe("date");
  });

  it("should detect time format", () => {
    expect(detectFormatType("HH-mm-ss")).toBe("time");
    expect(detectFormatType("hh:mm:ss")).toBe("time");
    expect(detectFormatType("HH:mm")).toBe("time");
  });

  it("should detect number format", () => {
    expect(detectFormatType("000")).toBe("number");
    expect(detectFormatType("0000")).toBe("number");
    expect(detectFormatType("0")).toBe("number");
  });

  it("should return 'unknown' for unrecognized formats", () => {
    expect(detectFormatType("foobar")).toBe("unknown");
    expect(detectFormatType("hello world")).toBe("unknown");
  });
});
