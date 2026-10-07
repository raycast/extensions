import { describe, expect, it } from "vitest";
import {
  dailyTimestamp,
  dailyNoteStem,
  formatDateLabel,
  formatWeekLabel,
  matchesDateQuery,
  parseFilenameDate,
  resolveDateQuery,
  resolveDateArg,
  toDailyStem,
} from "@lib/daily-desk";

const NOW = new Date(2026, 2, 26);

describe("resolveDateArg", () => {
  it("returns an empty string for browse mode", () => {
    expect(resolveDateArg(undefined, NOW)).toBe("");
    expect(resolveDateArg("   ", NOW)).toBe("");
  });

  it("normalizes a supported argument for quick open", () => {
    expect(resolveDateArg(" 22 Dec, 2026 ", NOW)).toBe("2026-12-22");
    expect(resolveDateArg("feb 3", NOW)).toBe("2026-02-03");
  });

  it("returns null for an invalid argument", () => {
    expect(resolveDateArg("not a date", NOW)).toBeNull();
  });
});

describe("resolveDateQuery validation", () => {
  it.each([
    "",
    "2026/03/26",
    "monday",
    "next month",
    "3 months ago",
    "2026-W1",
    "2026-02-30",
    "2026-W54",
    "banana",
    "feb 30",
  ])("rejects %s", (value) => {
    expect(resolveDateQuery(value)).toBeNull();
  });
});

describe("resolveDateQuery", () => {
  it("resolves ISO dates and weeks", () => {
    expect(resolveDateQuery("2026-03-26", NOW)).toEqual({ kind: "date", iso: "2026-03-26" });
    expect(resolveDateQuery("2026-W13", NOW)).toEqual({ kind: "week", week: "2026-W13" });
    expect(resolveDateQuery("2026-w13", NOW)).toEqual({ kind: "week", week: "2026-W13" });
  });

  it("resolves natural language dates relative to now", () => {
    expect(resolveDateQuery("today", NOW)).toEqual({ kind: "date", iso: "2026-03-26" });
    expect(resolveDateQuery("yesterday", NOW)).toEqual({ kind: "date", iso: "2026-03-25" });
    expect(resolveDateQuery("tomorrow", NOW)).toEqual({ kind: "date", iso: "2026-03-27" });
    expect(resolveDateQuery("2 days ago", NOW)).toEqual({ kind: "date", iso: "2026-03-24" });
    expect(resolveDateQuery("in 2 weeks", NOW)).toEqual({ kind: "date", iso: "2026-04-09" });
    expect(resolveDateQuery("next monday", NOW)).toEqual({ kind: "date", iso: "2026-03-30" });
    expect(resolveDateQuery("last friday", NOW)).toEqual({ kind: "date", iso: "2026-03-20" });
    expect(resolveDateQuery("2 weeks ago", NOW)).toEqual({ kind: "date", iso: "2026-03-12" });
  });

  it("resolves natural language weeks", () => {
    expect(resolveDateQuery("this week", NOW)).toEqual({ kind: "week", week: "2026-W13" });
    expect(resolveDateQuery("last week", NOW)).toEqual({ kind: "week", week: "2026-W12" });
    expect(resolveDateQuery("next week", NOW)).toEqual({ kind: "week", week: "2026-W14" });
  });

  it("resolves ISO week years at calendar boundaries", () => {
    expect(resolveDateQuery("this week", new Date(2027, 0, 3))).toEqual({ kind: "week", week: "2026-W53" });
    expect(resolveDateQuery("this week", new Date(2025, 11, 29))).toEqual({ kind: "week", week: "2026-W01" });
  });

  it("resolves singular relative units", () => {
    expect(resolveDateQuery("in 1 day", NOW)).toEqual({ kind: "date", iso: "2026-03-27" });
    expect(resolveDateQuery("1 day ago", NOW)).toEqual({ kind: "date", iso: "2026-03-25" });
    expect(resolveDateQuery("in 1 week", NOW)).toEqual({ kind: "date", iso: "2026-04-02" });
  });

  it("resolves month-day and full dates in both orders", () => {
    expect(resolveDateQuery("jan 15", NOW)).toEqual({ kind: "month-day", month: 1, day: 15 });
    expect(resolveDateQuery("december 25", NOW)).toEqual({ kind: "month-day", month: 12, day: 25 });
    expect(resolveDateQuery("22 Dec, 2026", NOW)).toEqual({ kind: "date", iso: "2026-12-22" });
    expect(resolveDateQuery("Dec 22, 2026", NOW)).toEqual({ kind: "date", iso: "2026-12-22" });
    expect(resolveDateQuery("january 15 2026", NOW)).toEqual({ kind: "date", iso: "2026-01-15" });
    expect(resolveDateQuery("15 january 2026", NOW)).toEqual({ kind: "date", iso: "2026-01-15" });
  });
});

describe("parseFilenameDate", () => {
  it("parses daily and weekly filenames", () => {
    expect(parseFilenameDate("2023-02-18.md")).toEqual({ kind: "date", iso: "2023-02-18" });
    expect(parseFilenameDate("2026-W03.md")).toEqual({ kind: "week", week: "2026-W03" });
    expect(parseFilenameDate("2026-w03.md")).toEqual({ kind: "week", week: "2026-W03" });
  });

  it("ignores files that are not Daily Desk notes", () => {
    expect(parseFilenameDate("notes.md")).toBeNull();
    expect(parseFilenameDate("today.md")).toBeNull();
    expect(parseFilenameDate("2026-W54.md")).toBeNull();
  });
});

describe("dailyNoteStem", () => {
  it("returns the filename stem for note paths", () => {
    expect(dailyNoteStem("Daily/2023-02-18.md")).toBe("2023-02-18");
    expect(dailyNoteStem("Daily/archive/2026-W03.md")).toBe("2026-W03");
  });
});

describe("formatDateLabel", () => {
  it("formats ISO dates", () => {
    expect(formatDateLabel("2023-02-18")).toBe("February 18, 2023");
    expect(formatDateLabel("2026-12-01")).toBe("December 1, 2026");
  });

  it("formats ISO weeks", () => {
    expect(formatWeekLabel("2026-W03")).toBe("Week 3, 2026");
  });
});

describe("matchesDateQuery", () => {
  it("matches exact dates and dates inside a week", () => {
    expect(matchesDateQuery({ kind: "date", iso: "2026-03-26" }, "2026-03-26.md")).toBe(true);
    expect(matchesDateQuery({ kind: "date", iso: "2026-03-26" }, "2026-03-27.md")).toBe(false);
    expect(matchesDateQuery({ kind: "date", iso: "2026-03-26" }, "2026-W13.md")).toBe(true);
    expect(matchesDateQuery({ kind: "date", iso: "2026-03-26" }, "2026-W12.md")).toBe(false);
  });

  it("matches weeks against weekly and daily notes", () => {
    expect(matchesDateQuery({ kind: "week", week: "2026-W13" }, "2026-W13.md")).toBe(true);
    expect(matchesDateQuery({ kind: "week", week: "2026-W13" }, "2026-03-26.md")).toBe(true);
    expect(matchesDateQuery({ kind: "week", week: "2026-W13" }, "2026-03-15.md")).toBe(false);
  });

  it("matches month-day expressions in any year", () => {
    const query = { kind: "month-day", month: 1, day: 15 } as const;

    expect(matchesDateQuery(query, "2023-01-15.md")).toBe(true);
    expect(matchesDateQuery(query, "2026-01-15.md")).toBe(true);
    expect(matchesDateQuery(query, "2024-01-16.md")).toBe(false);
    expect(matchesDateQuery(query, "2026-W03.md")).toBe(false);
  });
});

describe("toDailyStem", () => {
  it("keeps dates and weeks untouched", () => {
    expect(toDailyStem({ kind: "date", iso: "2023-02-18" }, NOW)).toBe("2023-02-18");
    expect(toDailyStem({ kind: "week", week: "2026-W03" }, NOW)).toBe("2026-W03");
  });

  it("resolves month-day expressions to the current year", () => {
    expect(toDailyStem({ kind: "month-day", month: 1, day: 15 }, NOW)).toBe("2026-01-15");
    expect(toDailyStem({ kind: "month-day", month: 2, day: 29 }, NOW)).toBe("2026-02-28");
  });
});

describe("dailyTimestamp", () => {
  it("orders daily notes before weekly notes when older", () => {
    const weekly = dailyTimestamp("2026-W03.md");
    const daily = dailyTimestamp("2023-02-18.md");

    expect(weekly).not.toBeNull();
    expect(daily).not.toBeNull();
    expect(weekly!).toBeGreaterThan(daily!);
  });

  it("orders notes within the same week by date", () => {
    const monday = dailyTimestamp("2026-W13.md");
    const thursday = dailyTimestamp("2026-03-26.md");
    const sunday = dailyTimestamp("2026-03-29.md");

    expect(monday).not.toBeNull();
    expect(thursday).not.toBeNull();
    expect(sunday).not.toBeNull();
    expect(monday!).toBeLessThan(thursday!);
    expect(thursday!).toBeLessThan(sunday!);
  });
});
