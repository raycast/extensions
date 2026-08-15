import { describe, it, expect } from "vitest";
import { normalizeWorkedTime } from "../src/utils/jira-worklog";

describe("normalizeWorkedTime", () => {
  describe("basic formats", () => {
    it("should handle hours only", () => {
      expect(normalizeWorkedTime("1")).toBe("1h");
      expect(normalizeWorkedTime("1.5")).toBe("1h 30m");
    });

    it("should handle minutes only", () => {
      expect(normalizeWorkedTime("30m")).toBe("30m");
      expect(normalizeWorkedTime("30.5m")).toBe("31m");
      expect(normalizeWorkedTime("30.2m")).toBe("30m");
    });

    it("should handle hours with minutes", () => {
      expect(normalizeWorkedTime("1h")).toBe("1h");
      expect(normalizeWorkedTime("1h 30m")).toBe("1h 30m");
      expect(normalizeWorkedTime("2h 45m")).toBe("2h 45m");
      expect(normalizeWorkedTime("1.5h")).toBe("1h 30m");
      expect(normalizeWorkedTime("1h 30.5m")).toBe("1h 31m");
      expect(normalizeWorkedTime("1h 30.2m")).toBe("1h 30m");
    });
  });

  describe("special cases", () => {
    it("should handle '1h 30' as '1h 30m'", () => {
      expect(normalizeWorkedTime("1h 30")).toBe("1h 30m");
      expect(normalizeWorkedTime("2h 45")).toBe("2h 45m");
      expect(normalizeWorkedTime("1.5h 30")).toBe("2h");
      expect(normalizeWorkedTime("1h 30.5")).toBe("1h 31m");
    });

    it("should handle '1 30' as '130h'", () => {
      expect(normalizeWorkedTime("1 30")).toBe("130h");
      expect(normalizeWorkedTime("2 45")).toBe("245h");
      expect(normalizeWorkedTime("1.5 30")).toBe("1h 32m");
    });
  });

  describe("edge cases", () => {
    it("should handle zero values", () => {
      expect(normalizeWorkedTime("0")).toBe("0h");
      expect(normalizeWorkedTime("0m")).toBe("0h");
      expect(normalizeWorkedTime("0h 0m")).toBe("0h");
    });

    it("should handle decimal rounding", () => {
      expect(normalizeWorkedTime("1.1h")).toBe("1h 6m");
      expect(normalizeWorkedTime("1.9h")).toBe("1h 54m");
      expect(normalizeWorkedTime("30.3m")).toBe("30m");
      expect(normalizeWorkedTime("30.7m")).toBe("31m");
    });

    it("should handle case insensitive input", () => {
      expect(normalizeWorkedTime("1H")).toBe("1h");
      expect(normalizeWorkedTime("30M")).toBe("30m");
      expect(normalizeWorkedTime("1H 30M")).toBe("1h 30m");
    });

    it("should handle whitespace", () => {
      expect(normalizeWorkedTime(" 1h ")).toBe("1h");
      expect(normalizeWorkedTime(" 1h 30m ")).toBe("1h 30m");
      expect(normalizeWorkedTime("1h  30m")).toBe("1h 30m");
    });

    it("should return original string for invalid input", () => {
      expect(normalizeWorkedTime("invalid")).toBe("invalid");
      expect(normalizeWorkedTime("1h 30m 45s")).toBe("1h 30m 45s");
      expect(normalizeWorkedTime("")).toBe("");
    });
  });

  describe("complex scenarios", () => {
    it("should handle large numbers", () => {
      expect(normalizeWorkedTime("24h")).toBe("24h");
      expect(normalizeWorkedTime("1440m")).toBe("24h");
      expect(normalizeWorkedTime("25h 30m")).toBe("25h 30m");
    });

    it("should handle fractional hours and minutes", () => {
      expect(normalizeWorkedTime("1.25h")).toBe("1h 15m");
      expect(normalizeWorkedTime("1h 15.5m")).toBe("1h 16m");
      expect(normalizeWorkedTime("1.5h 30.5m")).toBe("2h 1m");
    });

    it("should handle special case precedence", () => {
      // "1h 30" should be treated as "1h 30m", not "1 30" -> "130h"
      expect(normalizeWorkedTime("1h 30")).toBe("1h 30m");

      // "1 30" should be treated as "130h", not "1h 30m"
      expect(normalizeWorkedTime("1 30")).toBe("130h");
    });
  });
});
