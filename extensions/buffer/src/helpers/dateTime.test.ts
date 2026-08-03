import { describe, it, expect } from "vitest";
import {
  toDateOnlyIso,
  combineDateAndTime,
  TIME_FORMAT_REGEX,
} from "./dateTime";

describe("toDateOnlyIso", () => {
  it("truncates a date to midnight UTC", () => {
    const date = new Date("2026-03-15T14:30:00.000Z");
    expect(toDateOnlyIso(date)).toBe("2026-03-15T00:00:00.000Z");
  });

  it("keeps the calendar date stable regardless of the input time of day", () => {
    const morning = new Date("2026-03-15T00:01:00.000Z");
    const night = new Date("2026-03-15T23:59:00.000Z");
    expect(toDateOnlyIso(morning)).toBe(toDateOnlyIso(night));
  });
});

describe("TIME_FORMAT_REGEX", () => {
  it("accepts valid 24-hour HH:mm times", () => {
    expect(TIME_FORMAT_REGEX.test("00:00")).toBe(true);
    expect(TIME_FORMAT_REGEX.test("14:30")).toBe(true);
    expect(TIME_FORMAT_REGEX.test("23:59")).toBe(true);
  });

  it("rejects invalid time formats", () => {
    expect(TIME_FORMAT_REGEX.test("24:00")).toBe(false);
    expect(TIME_FORMAT_REGEX.test("10am")).toBe(false);
    expect(TIME_FORMAT_REGEX.test("1:30")).toBe(false);
    expect(TIME_FORMAT_REGEX.test("10:5")).toBe(false);
  });
});

describe("combineDateAndTime", () => {
  it("combines the calendar date with the given HH:mm time", () => {
    const date = new Date("2026-03-15T00:00:00.000Z");
    expect(combineDateAndTime(date, "14:30")).toBe("2026-03-15T14:30:00.000Z");
  });

  it("ignores any pre-existing time-of-day on the date and uses only its calendar date", () => {
    const date = new Date("2026-03-15T23:59:00.000Z");
    expect(combineDateAndTime(date, "09:00")).toBe("2026-03-15T09:00:00.000Z");
  });
});
