import { describe, it, expect } from "vitest";
import {
  toDateOnlyIso,
  combineDateAndTime,
  TIME_FORMAT_REGEX,
} from "./dateTime";

describe("toDateOnlyIso", () => {
  it("truncates a date to midnight UTC using its local calendar date", () => {
    const date = new Date(2026, 2, 15, 14, 30);
    expect(toDateOnlyIso(date)).toBe("2026-03-15T00:00:00.000Z");
  });

  it("keeps the calendar date stable regardless of the input time of day", () => {
    const morning = new Date(2026, 2, 15, 0, 1);
    const night = new Date(2026, 2, 15, 23, 59);
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
  it("combines the calendar date with the given HH:mm time in the local timezone", () => {
    const date = new Date(2026, 2, 15);
    const expected = new Date(2026, 2, 15, 14, 30).toISOString();
    expect(combineDateAndTime(date, "14:30")).toBe(expected);
  });

  it("ignores any pre-existing time-of-day on the date and uses only its calendar date", () => {
    const date = new Date(2026, 2, 15, 23, 59);
    const expected = new Date(2026, 2, 15, 9, 0).toISOString();
    expect(combineDateAndTime(date, "09:00")).toBe(expected);
  });
});
