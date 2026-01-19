import { describe, expect, it } from "vitest";

import { formatDuration, getErrorMessage } from "./format";

describe("formatDuration", () => {
  describe("default behavior", () => {
    it("formats seconds to hours and minutes with padding (floored by default)", () => {
      expect(formatDuration(3661)).toBe("01h 01m"); // 1h 1m 1s -> 1h 1m
      expect(formatDuration(7200)).toBe("02h 00m");
      expect(formatDuration(3600)).toBe("01h 00m");
      expect(formatDuration(1)).toBe("00h 00m");
    });

    it("handles zero seconds", () => {
      expect(formatDuration(0)).toBe("00h 00m");
    });

    it("handles minutes only", () => {
      expect(formatDuration(1800)).toBe("00h 30m");
      expect(formatDuration(61)).toBe("00h 01m");
    });

    it("handles large values", () => {
      expect(formatDuration(86400)).toBe("24h 00m");
      expect(formatDuration(90061)).toBe("25h 01m");
    });
  });

  describe("showZeroHours option", () => {
    it("hides hours when zero and showZeroHours is false", () => {
      expect(formatDuration(1800, { showZeroHours: false })).toBe("30m");
      expect(formatDuration(60, { showZeroHours: false })).toBe("01m");
    });

    it("still shows hours when non-zero even with showZeroHours false", () => {
      expect(formatDuration(3661, { showZeroHours: false })).toBe("01h 01m");
    });
  });

  describe("hideZeroMinutes option", () => {
    it("hides minutes when zero and hours > 0", () => {
      expect(formatDuration(3600, { hideZeroMinutes: true })).toBe("01h");
      expect(formatDuration(7200, { hideZeroMinutes: true })).toBe("02h");
    });

    it("still shows minutes when non-zero", () => {
      expect(formatDuration(3661, { hideZeroMinutes: true })).toBe("01h 01m");
    });

    it("still shows minutes when hours is zero", () => {
      expect(formatDuration(0, { hideZeroMinutes: true })).toBe("00h 00m");
    });
  });

  describe("padding options", () => {
    it("disables hour padding when padHours is false", () => {
      expect(formatDuration(3661, { padHours: false })).toBe("1h 01m");
    });

    it("disables minute padding when padMinutes is false", () => {
      expect(formatDuration(3661, { padMinutes: false })).toBe("01h 1m");
    });

    it("disables both when both padding options are false", () => {
      expect(formatDuration(3661, { padHours: false, padMinutes: false })).toBe("1h 1m");
    });
  });

  describe("combined options", () => {
    it("combines showZeroHours and padMinutes", () => {
      expect(formatDuration(60, { showZeroHours: false, padMinutes: false })).toBe("1m");
    });
  });

  describe("ceiling option", () => {
    it("rounds up to the nearest minute when ceiling is true", () => {
      expect(formatDuration(1, { ceiling: true })).toBe("00h 01m");
      expect(formatDuration(59, { ceiling: true })).toBe("00h 01m");
      expect(formatDuration(61, { ceiling: true })).toBe("00h 02m");
    });

    it("is disabled by default", () => {
      expect(formatDuration(1)).toBe("00h 00m");
      expect(formatDuration(59)).toBe("00h 00m");
      expect(formatDuration(61)).toBe("00h 01m");
    });

    it("handles zero seconds correctly", () => {
      expect(formatDuration(0, { ceiling: true })).toBe("00h 00m");
      expect(formatDuration(0, { ceiling: false })).toBe("00h 00m");
    });
  });
});

describe("getErrorMessage", () => {
  it("returns message from Error instance", () => {
    const error = new Error("Something went wrong");
    expect(getErrorMessage(error)).toBe("Something went wrong");
  });

  it("returns stringified value for non-Error", () => {
    expect(getErrorMessage("string error")).toBe("string error");
    expect(getErrorMessage(42)).toBe("42");
    expect(getErrorMessage(null)).toBe("null");
    expect(getErrorMessage(undefined)).toBe("undefined");
  });

  it("handles objects", () => {
    expect(getErrorMessage({ code: 500 })).toBe("[object Object]");
  });
});
