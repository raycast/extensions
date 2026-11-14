import { afterAll, beforeAll, describe, expect, it } from "vitest";
import getScoreDates, { formatDate } from "./scoreDates";

const today = new Date("2026-09-19T12:00:00.000Z");

describe("scoreDates", () => {
  it("formats a scoreboard date without a range delimiter", () => {
    expect(formatDate(today)).toBe("20260919");
  });

  it("returns one date per requested day, oldest first", () => {
    expect(getScoreDates(today, "2")).toEqual(["20260917", "20260918", "20260919"]);
  });

  it("always returns today, whatever the preference holds", () => {
    for (const numDaysScores of ["0", "", "abc", "-1", "1.5", "7"]) {
      expect(getScoreDates(today, numDaysScores)).toContain("20260919");
    }
  });

  it("returns dates for a numeric preference as well as a string one", () => {
    expect(getScoreDates(today, 2)).toEqual(getScoreDates(today, "2"));
  });

  it("caps the maximum number of previous score days (control)", () => {
    const dates = getScoreDates(today, "30");

    expect(dates).toHaveLength(31);
    expect(dates[0]).toBe("20260820");
    expect(dates[30]).toBe("20260919");
  });

  it("caps a preference one day above the number of previous score days", () => {
    expect(getScoreDates(today, "31")).toEqual(getScoreDates(today, "30"));
  });

  it("caps a preference far above the number of previous score days", () => {
    expect(getScoreDates(today, "1000")).toEqual(getScoreDates(today, "30"));
  });

  it("returns only today for a preference that is not a finite number of days", () => {
    for (const numDaysScores of ["Infinity", "-Infinity", "1e309", "NaN"]) {
      expect(getScoreDates(today, numDaysScores)).toEqual(["20260919"]);
    }
  });

  it("returns only today for a preference that is absent altogether", () => {
    for (const numDaysScores of [undefined, null]) {
      expect(getScoreDates(today, numDaysScores as never)).toEqual(["20260919"]);
    }
  });

  it("returns only today for a finite preference that steps past the dates a Date can hold", () => {
    for (const numDaysScores of [String(Number.MAX_VALUE), "1e15"]) {
      expect(getScoreDates(today, numDaysScores)).toEqual(["20260919"]);
    }
  });

  it("crosses a month boundary", () => {
    expect(getScoreDates(new Date("2026-10-01T12:00:00.000Z"), "2")).toEqual(["20260929", "20260930", "20261001"]);
  });

  it("crosses a year boundary", () => {
    expect(getScoreDates(new Date("2027-01-01T12:00:00.000Z"), "2")).toEqual(["20261230", "20261231", "20270101"]);
  });

  it("crosses the end of a leap February", () => {
    expect(getScoreDates(new Date("2028-03-01T12:00:00.000Z"), "2")).toEqual(["20280228", "20280229", "20280301"]);
  });

  it("leaves the date it was given untouched", () => {
    const given = new Date("2026-09-19T12:00:00.000Z");

    getScoreDates(given, "7");

    expect(given.toISOString()).toBe("2026-09-19T12:00:00.000Z");
  });

  describe("across a daylight-saving change", () => {
    let previousTz: string | undefined;

    beforeAll(() => {
      previousTz = process.env.TZ;
      process.env.TZ = "America/New_York";
    });

    afterAll(() => {
      process.env.TZ = previousTz;
    });

    it("steps one UTC date at a time when the clocks go forward", () => {
      expect(getScoreDates(new Date("2026-03-09T23:30:00.000Z"), "2")).toEqual(["20260307", "20260308", "20260309"]);
    });

    it("steps one UTC date at a time when the clocks go back", () => {
      expect(getScoreDates(new Date("2026-11-03T00:30:00.000Z"), "2")).toEqual(["20261101", "20261102", "20261103"]);
    });

    it("steps one UTC date at a time away from a change (control: local stepping agrees here)", () => {
      expect(getScoreDates(new Date("2026-06-15T23:30:00.000Z"), "2")).toEqual(["20260613", "20260614", "20260615"]);
    });
  });
});
