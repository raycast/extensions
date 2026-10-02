import { describe, expect, it } from "vitest";
import fixture from "./fixtures/forecast-valid.json";
import { parseForecastResponse, type ResetRecord } from "../src/api/forecast-schema";
import { calendarMonthDescription, calendarMonthSummary, resetCalendar } from "../src/domain/reset-calendar";

const response = parseForecastResponse(fixture);
const now = new Date("2026-09-09T07:00:00Z");

function record(id: string, dateTime: string, type = "forced-reset"): ResetRecord {
  return { ...response.history[0], id, dateTime, type };
}

function withHistory(history: ResetRecord[]) {
  return { ...response, history, evidence: [] };
}

describe("recent reset calendar", () => {
  it("shows the previous and current calendar months, even on the 31st", () => {
    const months = resetCalendar(withHistory([]), new Date("2026-03-31T12:00:00Z"), "UTC");
    expect(months.map((month) => month.key)).toEqual(["2026-02", "2026-03"]);
    expect(months.map((month) => month.days.length)).toEqual([28, 31]);
    expect(months.map((month) => month.firstWeekday)).toEqual([6, 6]);
    expect(months[1].days.at(-1)).toMatchObject({ key: "2026-03-31", isFuture: false });
  });

  it("handles year boundaries and leap years", () => {
    const january = resetCalendar(withHistory([]), new Date("2026-01-15T12:00:00Z"), "UTC");
    expect(january.map((month) => month.key)).toEqual(["2025-12", "2026-01"]);
    const leap = resetCalendar(withHistory([]), new Date("2024-03-01T12:00:00Z"), "UTC");
    expect(leap[0].days.at(-1)?.key).toBe("2024-02-29");
    expect(leap[0].firstWeekday).toBe(3); // Thursday, in a Monday-first calendar.
  });

  it("counts reset days once while preserving all records for drill-down", () => {
    const months = resetCalendar(
      withHistory([
        record("first", "2026-09-08T04:00:00Z"),
        record("second-source", "2026-09-08T05:00:00Z"),
        record("compensation", "2026-09-03T12:00:00Z", "compensation"),
        record("old", "2026-07-31T12:00:00Z"),
      ]),
      now,
      "UTC",
    );
    expect(months.map((month) => month.resetDays)).toEqual([0, 2]);
    expect(months[1].days[7].records.map((item) => item.id)).toEqual(["second-source", "first"]);
    expect(calendarMonthSummary(months[1])).toBe("2 reset days · so far");
    expect(calendarMonthDescription(months[1])).toContain("Reset dates: 3, 8.");
  });

  it("excludes announcements, banked records, unknown types, and future resets", () => {
    const months = resetCalendar(
      withHistory([
        record("banked", "2026-09-01T12:00:00Z", "banked-reset"),
        record("announced", "2026-09-02T12:00:00Z", "announcement"),
        record("unknown", "2026-09-03T12:00:00Z", "new-type"),
        record("later-today", "2026-09-09T08:00:00Z"),
        record("tomorrow", "2026-09-10T01:00:00Z"),
      ]),
      now,
      "UTC",
    );
    expect(months[1].resetDays).toBe(0);
    expect(months[1].days[8]).toMatchObject({ isFuture: false, records: [] });
    expect(months[1].days[9]).toMatchObject({ isFuture: true, records: [] });
    expect(months[0].days.every((day) => !day.isFuture)).toBe(true);
  });

  it("uses the system time zone for both month boundaries and reset dates", () => {
    const boundary = new Date("2026-09-01T01:00:00Z");
    const history = withHistory([record("boundary", "2026-09-01T00:30:00Z")]);
    const local = resetCalendar(history, boundary, "America/Toronto");
    expect(local.map((month) => month.key)).toEqual(["2026-07", "2026-08"]);
    expect(local[1].days[30]).toMatchObject({ isFuture: false, key: "2026-08-31" });
    expect(local[1].days[30].records[0].id).toBe("boundary");
    const utc = resetCalendar(history, boundary, "UTC");
    expect(utc[1].key).toBe("2026-09");
    expect(utc[1].days[0].records[0].id).toBe("boundary");
  });

  it("groups both occurrences of a daylight-saving hour on the same day", () => {
    const months = resetCalendar(
      withHistory([
        record("before-fallback", "2026-11-01T05:30:00Z"),
        record("after-fallback", "2026-11-01T06:30:00Z"),
      ]),
      new Date("2026-11-02T12:00:00Z"),
      "America/Toronto",
    );
    expect(months[1].resetDays).toBe(1);
    expect(months[1].days[0].records).toHaveLength(2);
    expect(calendarMonthSummary(months[1])).toBe("1 reset day · so far");
  });

  it("keeps empty months visible without implying that future days were observed", () => {
    const months = resetCalendar(withHistory([]), now, "UTC");
    expect(calendarMonthSummary(months[0])).toBe("0 reset days");
    expect(calendarMonthDescription(months[1])).toContain("No confirmed resets recorded.");
    expect(months[1].days.filter((day) => day.isFuture)).toHaveLength(21);
  });
});
