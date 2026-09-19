import { describe, expect, it } from "vitest";
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

  it("crosses a month boundary", () => {
    expect(getScoreDates(new Date("2026-10-01T12:00:00.000Z"), "2")).toEqual(["20260929", "20260930", "20261001"]);
  });
});
