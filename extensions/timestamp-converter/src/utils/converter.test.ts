import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseSearchQuery,
  formatDateResults,
  convertTimestamp,
  detectInputType,
} from "./converter";

describe("detectInputType", () => {
  it("should return 'empty' for empty string", () => {
    expect(detectInputType("")).toBe("empty");
    expect(detectInputType("   ")).toBe("empty");
  });

  it("should return 'now' for 'now' keyword", () => {
    expect(detectInputType("now")).toBe("now");
    expect(detectInputType("NOW")).toBe("now");
    expect(detectInputType("Now")).toBe("now");
  });

  it("should return 'timestamp_s' for short numeric strings (<=11 digits)", () => {
    expect(detectInputType("1703145600")).toBe("timestamp_s"); // 10 digits
    expect(detectInputType("12345678901")).toBe("timestamp_s"); // 11 digits
    expect(detectInputType("0")).toBe("timestamp_s");
  });

  it("should return 'timestamp_ms' for long numeric strings (>11 digits)", () => {
    expect(detectInputType("1703145600000")).toBe("timestamp_ms"); // 13 digits
    expect(detectInputType("123456789012")).toBe("timestamp_ms"); // 12 digits
  });

  it("should return 'date_string' for date-like strings", () => {
    expect(detectInputType("2023-12-21")).toBe("date_string");
    expect(detectInputType("2023-12-21 10:00:00")).toBe("date_string");
    expect(detectInputType("2023-12-21T10:00:00Z")).toBe("date_string");
  });
});

describe("parseSearchQuery", () => {
  const targetTimezone = "Asia/Shanghai";

  // Mock Date for consistent testing
  const mockDate = new Date("2024-12-21T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return current time for empty query", () => {
    const result = parseSearchQuery("", targetTimezone);

    expect(result).not.toBeNull();
    expect(result!.description).toBe("Current Time");
    expect(result!.date.getTime()).toBe(mockDate.getTime());
  });

  it("should return current time for 'now' keyword", () => {
    const result = parseSearchQuery("now", targetTimezone);

    expect(result).not.toBeNull();
    expect(result!.description).toBe("Current Time");
  });

  it("should parse Unix timestamp in seconds correctly", () => {
    // 1703145600 = 2023-12-21 08:00:00 UTC
    const result = parseSearchQuery("1703145600", targetTimezone);

    expect(result).not.toBeNull();
    expect(result!.description).toBe("From Unix Timestamp (s)");
    expect(result!.date.getTime()).toBe(1703145600 * 1000);
  });

  it("should parse Unix timestamp in milliseconds correctly", () => {
    // 1703145600000 = 2023-12-21 08:00:00 UTC
    const result = parseSearchQuery("1703145600000", targetTimezone);

    expect(result).not.toBeNull();
    expect(result!.description).toBe("From Unix Timestamp (ms)");
    expect(result!.date.getTime()).toBe(1703145600000);
  });

  it("should parse ISO date string", () => {
    const result = parseSearchQuery("2023-12-21", targetTimezone);

    expect(result).not.toBeNull();
    expect(result!.description).toContain("From Date String");
  });

  it("should parse date string with time", () => {
    const result = parseSearchQuery("2023-12-21 10:30:00", targetTimezone);

    expect(result).not.toBeNull();
    expect(result!.description).toContain("From Date String");
  });

  it("should parse date string with explicit timezone", () => {
    const result = parseSearchQuery("2023-12-21T10:00:00Z", targetTimezone);

    expect(result).not.toBeNull();
    expect(result!.description).toBe("From Date String (Explicit Offset)");
  });

  it("should return null for invalid input", () => {
    const result = parseSearchQuery("not-a-date", targetTimezone);
    expect(result).toBeNull();
  });
});

describe("formatDateResults", () => {
  const targetTimezone = "Asia/Shanghai";

  it("should format date into 4 result items", () => {
    const testDate = new Date("2023-12-21T08:00:00Z"); // 16:00 in Shanghai
    const results = formatDateResults(testDate, targetTimezone);

    expect(results).toHaveLength(4);
  });

  it("should include formatted date in target timezone", () => {
    const testDate = new Date("2023-12-21T08:00:00Z"); // 16:00 in Shanghai
    const results = formatDateResults(testDate, targetTimezone);

    expect(results[0].subtitle).toBe(`Time in ${targetTimezone}`);
    expect(results[0].title).toBe("2023-12-21 16:00:00");
  });

  it("should include Unix timestamp in seconds", () => {
    const testDate = new Date("2023-12-21T08:00:00Z");
    const results = formatDateResults(testDate, targetTimezone);

    expect(results[1].subtitle).toBe("Unix Timestamp (s)");
    expect(results[1].title).toBe("1703145600");
  });

  it("should include Unix timestamp in milliseconds", () => {
    const testDate = new Date("2023-12-21T08:00:00Z");
    const results = formatDateResults(testDate, targetTimezone);

    expect(results[2].subtitle).toBe("Unix Timestamp (ms)");
    expect(results[2].title).toBe("1703145600000");
  });

  it("should include full format with timezone abbreviation", () => {
    const testDate = new Date("2023-12-21T08:00:00Z");
    const results = formatDateResults(testDate, targetTimezone);

    expect(results[3].subtitle).toBe("Full Format");
    expect(results[3].title).toContain("2023-12-21 16:00:00");
  });
});

describe("convertTimestamp", () => {
  const targetTimezone = "Asia/Shanghai";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-12-21T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 4 results for valid input", () => {
    const results = convertTimestamp("1703145600", targetTimezone);

    expect(results).toHaveLength(4);
  });

  it("should return empty array for invalid input", () => {
    const results = convertTimestamp("invalid-date-string", targetTimezone);

    expect(results).toHaveLength(0);
  });

  it("should handle empty input (current time)", () => {
    const results = convertTimestamp("", targetTimezone);

    expect(results).toHaveLength(4);
    expect(results[0].subtitle).toBe(`Time in ${targetTimezone}`);
  });

  it("should work with different timezones", () => {
    const testDate = new Date("2023-12-21T08:00:00Z");
    const unixS = Math.floor(testDate.getTime() / 1000).toString();

    // Test with Shanghai (UTC+8)
    const shanghaiResults = convertTimestamp(unixS, "Asia/Shanghai");
    expect(shanghaiResults[0].title).toBe("2023-12-21 16:00:00");

    // Test with New York (UTC-5 in winter)
    const nyResults = convertTimestamp(unixS, "America/New_York");
    expect(nyResults[0].title).toBe("2023-12-21 03:00:00");

    // Test with UTC
    const utcResults = convertTimestamp(unixS, "UTC");
    expect(utcResults[0].title).toBe("2023-12-21 08:00:00");
  });
});

describe("Edge cases", () => {
  const targetTimezone = "UTC";

  it("should handle zero timestamp", () => {
    const results = convertTimestamp("0", targetTimezone);

    expect(results).toHaveLength(4);
    expect(results[0].title).toBe("1970-01-01 00:00:00");
  });

  it("should handle very large timestamp (year 2100+)", () => {
    // 4102444800 = 2100-01-01 00:00:00 UTC
    const results = convertTimestamp("4102444800", targetTimezone);

    expect(results).toHaveLength(4);
    expect(results[0].title).toBe("2100-01-01 00:00:00");
  });

  it("should handle boundary between seconds and milliseconds (11 digits)", () => {
    // 11 digits should be treated as seconds
    const result11 = convertTimestamp("10000000000", targetTimezone);
    expect(result11).toHaveLength(4);
    // 10000000000 seconds = 2286-11-20 17:46:40 UTC
    expect(result11[1].title).toBe("10000000000"); // Unix s

    // 12 digits should be treated as milliseconds
    const result12 = convertTimestamp("100000000000", targetTimezone);
    expect(result12).toHaveLength(4);
    expect(result12[2].title).toBe("100000000000"); // Unix ms
  });

  it("should handle date with only year-month-day", () => {
    const results = convertTimestamp("2023-06-15", targetTimezone);

    expect(results).toHaveLength(4);
  });

  it("should handle whitespace in input", () => {
    const results = convertTimestamp("  1703145600  ", targetTimezone);

    expect(results).toHaveLength(4);
    expect(results[1].title).toBe("1703145600");
  });
});
