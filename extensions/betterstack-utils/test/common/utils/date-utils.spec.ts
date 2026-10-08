import { describe, expect, it } from "vitest";
import { formatDuration, toYearWeek } from "@/common/utils/date-utils";

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

describe("formatDuration", () => {
  it.each`
    seconds  | expected
    ${0}     | ${"0s"}
    ${45}    | ${"45s"}
    ${60}    | ${"1m"}
    ${200}   | ${"3m 20s"}
    ${600}   | ${"10m"}
    ${3723}  | ${"1h 2m"}
    ${90000} | ${"1d 1h"}
  `("formats $seconds seconds as $expected", ({ seconds, expected }) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
