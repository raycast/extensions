import { describe, expect, it } from "vitest";
import {
  buildMonthPage,
  clampDate,
  clampYear,
  decadePage,
  decadeStart,
  monthsOfYear,
  moveToMonth,
  monthRowId,
  moveToYear,
  resolveWeekNumbering,
  shiftMonth,
  shiftYear,
  toDayId,
  toMonthId,
  weekNumber,
  WeekNumbering,
  WeekStartsOn,
  weekRowId,
  withTimeOf,
  yearRowId,
} from "./calendar";

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const ids = (dates: Date[]) => dates.map(toDayId);

describe("buildMonthPage", () => {
  it("always returns six full weeks starting on the week start", () => {
    for (const weekStartsOn of [0, 1] as WeekStartsOn[]) {
      for (let month = 1; month <= 12; month++) {
        const page = buildMonthPage(day(2026, month, 1), weekStartsOn);
        expect(page).toHaveLength(42);
        expect(page[0].getDay()).toBe(weekStartsOn);
      }
    }
  });

  it("contains every day of the month exactly once, in order", () => {
    for (const [year, month, length] of [
      [2026, 2, 28],
      [2028, 2, 29],
      [2026, 10, 31],
      [2026, 11, 30],
    ]) {
      const page = buildMonthPage(day(year, month, 15), 0);
      const inMonth = page.filter((date) => date.getMonth() === month - 1);
      expect(inMonth.map((date) => date.getDate())).toEqual(Array.from({ length }, (_, i) => i + 1));
      expect(new Set(ids(page)).size).toBe(42);
    }
  });

  it("pads with days of the neighboring months", () => {
    const page = buildMonthPage(day(2026, 10, 15), 0);
    expect(toDayId(page[0])).toBe("2026-09-27");
    expect(toDayId(page[41])).toBe("2026-11-07");
  });

  it("starts on the 1st when the month begins on the week start", () => {
    // February 2026 begins on a Sunday.
    expect(toDayId(buildMonthPage(day(2026, 2, 1), 0)[0])).toBe("2026-02-01");
    // June 2026 begins on a Monday.
    expect(toDayId(buildMonthPage(day(2026, 6, 1), 1)[0])).toBe("2026-06-01");
  });

  it("handles pages that cross a year boundary", () => {
    const page = buildMonthPage(day(2027, 1, 1), 1);
    expect(toDayId(page[0])).toBe("2026-12-28");
  });
});

describe("month and year moves", () => {
  it("keeps the day of month when it exists", () => {
    expect(toDayId(shiftMonth(day(2026, 10, 15), 1))).toBe("2026-11-15");
    expect(toDayId(shiftMonth(day(2026, 10, 15), -10))).toBe("2025-12-15");
  });

  it("clamps to the end of shorter months", () => {
    expect(toDayId(shiftMonth(day(2026, 1, 31), 1))).toBe("2026-02-28");
    expect(toDayId(shiftMonth(day(2028, 1, 31), 1))).toBe("2028-02-29");
    expect(toDayId(shiftMonth(day(2026, 3, 31), -1))).toBe("2026-02-28");
    expect(toDayId(shiftMonth(day(2026, 10, 31), 1))).toBe("2026-11-30");
  });

  it("moves by years and clamps leap days", () => {
    expect(toDayId(shiftYear(day(2026, 10, 15), 1))).toBe("2027-10-15");
    expect(toDayId(shiftYear(day(2028, 2, 29), 1))).toBe("2029-02-28");
    expect(toDayId(shiftYear(day(2028, 2, 29), -4))).toBe("2024-02-29");
  });

  it("moves to a given month or year", () => {
    expect(toDayId(moveToMonth(day(2026, 1, 31), day(2026, 4, 1)))).toBe("2026-04-30");
    expect(toDayId(moveToMonth(day(2026, 10, 15), day(2030, 3, 1)))).toBe("2030-03-15");
    expect(toDayId(moveToYear(day(2028, 2, 29), 2027))).toBe("2027-02-28");
  });
});

describe("month and decade pages", () => {
  it("lists the twelve months of a year", () => {
    const months = monthsOfYear(day(2026, 10, 15));
    expect(months.map(toMonthId)).toEqual(
      Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`),
    );
  });

  it("groups years by decade with one year on each side", () => {
    expect(decadeStart(2026)).toBe(2020);
    expect(decadeStart(2020)).toBe(2020);
    expect(decadeStart(2029)).toBe(2020);
    expect(decadeStart(1999)).toBe(1990);
    expect(decadePage(2026)).toEqual([2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]);
    expect(decadePage(2030)[0]).toBe(2029);
  });
});

describe("week numbers", () => {
  const row = (start: Date): Record<WeekNumbering, number> => ({
    iso: weekNumber(start, "iso"),
    western: weekNumber(start, "western"),
    "middle-eastern": weekNumber(start, "middle-eastern"),
  });

  it("agrees on an ordinary week", () => {
    expect(row(day(2026, 10, 11))).toEqual({ iso: 42, western: 42, "middle-eastern": 42 });
    expect(row(day(2026, 10, 12))).toEqual({ iso: 42, western: 42, "middle-eastern": 42 });
  });

  it("differs around the turn of the year", () => {
    // Sunday-start rows around 2027-01-01 (a Friday).
    expect(row(day(2026, 12, 27))).toEqual({ iso: 53, western: 1, "middle-eastern": 1 });
    expect(row(day(2027, 1, 3))).toEqual({ iso: 1, western: 2, "middle-eastern": 2 });
    // Monday-start rows.
    expect(row(day(2026, 12, 28))).toEqual({ iso: 53, western: 1, "middle-eastern": 1 });
    expect(row(day(2027, 1, 4))).toEqual({ iso: 1, western: 2, "middle-eastern": 2 });
  });

  it("separates western and middle-eastern weeks when Jan 1 is a Saturday", () => {
    expect(row(day(2027, 12, 26))).toEqual({ iso: 52, western: 1, "middle-eastern": 53 });
    expect(row(day(2028, 1, 2))).toEqual({ iso: 1, western: 2, "middle-eastern": 1 });
  });

  it("resolves auto from the week start", () => {
    expect(resolveWeekNumbering("auto", 0)).toBe("western");
    expect(resolveWeekNumbering("auto", 1)).toBe("iso");
    expect(resolveWeekNumbering("middle-eastern", 1)).toBe("middle-eastern");
  });
});

describe("supported range", () => {
  it("keeps years within four digits", () => {
    expect(clampYear(2026)).toBe(2026);
    expect(clampYear(999)).toBe(1000);
    expect(clampYear(-1)).toBe(1000);
    expect(clampYear(10000)).toBe(9999);
  });

  it("keeps dates between 1000-01-01 and 9999-12-31", () => {
    expect(toDayId(clampDate(day(2026, 10, 15)))).toBe("2026-10-15");
    expect(toDayId(clampDate(shiftYear(day(1000, 3, 15), -1)))).toBe("1000-01-01");
    expect(toDayId(clampDate(shiftMonth(day(9999, 12, 15), 1)))).toBe("9999-12-31");
    expect(toDayId(clampDate(day(1000, 1, 1)))).toBe("1000-01-01");
  });
});

describe("row ids", () => {
  it("groups days by calendar week", () => {
    expect(weekRowId(day(2026, 10, 11), 0)).toBe(weekRowId(day(2026, 10, 17), 0));
    expect(weekRowId(day(2026, 10, 17), 0)).not.toBe(weekRowId(day(2026, 10, 18), 0));
    // With Monday-start weeks, Sunday ends the row instead of starting it.
    expect(weekRowId(day(2026, 10, 18), 1)).toBe(weekRowId(day(2026, 10, 12), 1));
  });

  it("groups months by row of four and year", () => {
    expect(monthRowId(day(2026, 1, 1))).toBe(monthRowId(day(2026, 4, 1)));
    expect(monthRowId(day(2026, 4, 1))).not.toBe(monthRowId(day(2026, 5, 1)));
    expect(monthRowId(day(2026, 12, 1))).not.toBe(monthRowId(day(2027, 12, 1)));
  });

  it("groups years by row on their decade page", () => {
    // The 2020s page is 2019-2030: rows 2019-2022, 2023-2026, 2027-2030.
    expect(yearRowId(2020)).toBe(yearRowId(2022));
    expect(yearRowId(2022)).not.toBe(yearRowId(2023));
    expect(yearRowId(2029)).toBe(yearRowId(2027));
    // 2019 belongs to the 2010s page.
    expect(yearRowId(2019)).not.toBe(yearRowId(2020));
  });
});

describe("withTimeOf", () => {
  it("keeps the day and takes the time of day from the other date", () => {
    const opened = new Date(2026, 9, 15, 14, 30, 5);
    const moved = withTimeOf(shiftMonth(day(2026, 10, 15), 1), opened);
    expect(moved.getFullYear()).toBe(2026);
    expect(moved.getMonth()).toBe(10);
    expect(moved.getDate()).toBe(15);
    expect([moved.getHours(), moved.getMinutes(), moved.getSeconds()]).toEqual([14, 30, 5]);
  });
});
