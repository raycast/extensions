import { describe, it, expect } from "vitest";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { parseDuration } from "./parseDuration";

dayjs.extend(duration);

const TEST_CASES = [
  // Basic minutes
  { input: "20m", totalMinutes: 20 },
  { input: "90 min", totalMinutes: 90 },
  { input: "45 minutes", totalMinutes: 45 },

  // Basic hours
  { input: "1h", totalMinutes: 60 },
  { input: "2 hours", totalMinutes: 120 },
  { input: "3 hour", totalMinutes: 180 },

  // Decimals
  { input: "1.5h", totalMinutes: 90 },
  { input: "0.5 hours", totalMinutes: 30 },
  { input: ".25h", totalMinutes: 15 },
  { input: ".5", totalMinutes: 30 },
  { input: "1.5", totalMinutes: 90 },

  // Compound
  { input: "1h30m", totalMinutes: 90 },
  { input: "2h 15m", totalMinutes: 135 },
  { input: "1:30", totalMinutes: 90 },
  { input: "2:05", totalMinutes: 125 },

  // Edge cases
  { input: "  1h  ", totalMinutes: 60 },
  { input: "1H", totalMinutes: 60 },

  // Supports add/subtract operations
  { input: "1.5 + 0.5", totalMinutes: 120 },
  { input: "1.5 - 0.5", totalMinutes: 60 },
  { input: "1.5 + 0.5h", totalMinutes: 120 },
  { input: "5m+2h", totalMinutes: 120 + 5 },
  { input: "2h- 1h30m", totalMinutes: 30 },
  { input: "5min + 1 hour", totalMinutes: 5 + 60 },
  { input: "1.5 - 45m", totalMinutes: 90 - 45 },
  { input: "1+1+2", totalMinutes: 4 * 60 },
  { input: "1+15m-5m", totalMinutes: 60 + 15 - 5 },
];

const INVALID_CASES = ["", "abc", "h", ":", "1:", "1-2"];

describe("parseDuration", () => {
  it.each(TEST_CASES)("parses '$input' to $totalMinutes minutes", ({ input, totalMinutes }) => {
    const result = parseDuration(input);
    expect(result).not.toBeNull();
    expect(result!.asMinutes()).toBe(totalMinutes);
  });

  it.each(INVALID_CASES)("returns null for invalid input: '%s'", (input) => {
    expect(parseDuration(input)).toBeNull();
  });
});
