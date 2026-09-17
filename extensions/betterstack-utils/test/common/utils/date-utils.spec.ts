import { describe, expect, it } from "vitest";
import { toYearWeek } from "@/common/utils/date-utils";

describe("toYearWeek", () => {
  it.each`
    date                      | expectedYearDate
    ${new Date(2026, 1, 23)}  | ${"2026-W09"}
    ${new Date(2026, 2, 1)}   | ${"2026-W09"}
    ${new Date(2025, 11, 29)} | ${"2026-W01"}
  `("maps $date to $expectedYearDate", ({ date, expectedYearDate }) => {
    expect(toYearWeek(date)).toBe(expectedYearDate);
  });
});
