import { describe, expect, it } from "vitest";
import {
  buildRepeat,
  describeRepeat,
  firstOccurrence,
  hideUntilFor,
  normalizeRepeat,
  reanchorRepeat,
  RepeatError,
} from "../src/lib/repeat";

const at = (iso: string) => new Date(iso);
const seconds = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("buildRepeat", () => {
  it("anchors the rule at the start date and time, like Amplenote does", () => {
    expect(buildRepeat(at("2026-10-22T09:00:00"), "weekly")).toBe("DTSTART:20261022T090000\nRRULE:FREQ=WEEKLY");
  });

  it.each([
    ["daily", "FREQ=DAILY"],
    ["weekdays", "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"],
    ["biweekly", "FREQ=WEEKLY;INTERVAL=2"],
    ["monthly", "FREQ=MONTHLY"],
    ["yearly", "FREQ=YEARLY"],
  ] as const)("builds %s", (preset, rule) => {
    expect(buildRepeat(at("2026-10-22T09:00:00"), preset)).toBe(`DTSTART:20261022T090000\nRRULE:${rule}`);
  });
});

describe("normalizeRepeat", () => {
  const start = at("2026-10-26T08:30:00");

  it("accepts a bare rule and adds the start as anchor", () => {
    expect(normalizeRepeat("FREQ=WEEKLY;BYDAY=MO", start)).toBe("DTSTART:20261026T083000\nRRULE:FREQ=WEEKLY;BYDAY=MO");
  });

  it("accepts an RRULE: prefix and replaces any DTSTART with the task's start", () => {
    expect(normalizeRepeat("DTSTART:20200101T000000\nRRULE:FREQ=DAILY;INTERVAL=2", start)).toBe(
      "DTSTART:20261026T083000\nRRULE:FREQ=DAILY;INTERVAL=2",
    );
  });

  it("rejects rules Amplenote can't store, with a helpful message", () => {
    expect(() => normalizeRepeat("every monday", start)).toThrow(RepeatError);
    expect(() => normalizeRepeat("FREQ=SOMETIMES", start)).toThrow(/RRULE/);
  });
});

describe("firstOccurrence", () => {
  it("moves the start to the next day the rule allows", () => {
    // Saturday → next Monday for a Monday rule, keeping the time.
    expect(firstOccurrence(at("2026-10-24T08:30:00"), "FREQ=WEEKLY;BYDAY=MO")).toEqual(at("2026-10-26T08:30:00"));
  });

  it("keeps a start that already matches", () => {
    expect(firstOccurrence(at("2026-10-26T08:30:00"), "FREQ=WEEKLY;BYDAY=MO,TH")).toEqual(at("2026-10-26T08:30:00"));
  });

  it("leaves rules without weekdays alone", () => {
    expect(firstOccurrence(at("2026-10-24T08:30:00"), "FREQ=MONTHLY")).toEqual(at("2026-10-24T08:30:00"));
  });
});

describe("describeRepeat", () => {
  it.each([
    ["DTSTART:20261022T090000\nRRULE:FREQ=DAILY", "Every day at 09:00"],
    ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", "Every weekday"],
    ["DTSTART:20261026T083000\nRRULE:FREQ=WEEKLY;BYDAY=MO", "Every week on Monday at 08:30"],
    ["DTSTART:20261022T090000\nRRULE:FREQ=WEEKLY", "Every week on Thursday at 09:00"],
    ["RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=FR", "Every 2 weeks on Friday"],
    ["RRULE:FREQ=MONTHLY", "Every month"],
    ["RRULE:FREQ=YEARLY", "Every year"],
  ])("describes %j", (rule, text) => {
    expect(describeRepeat(rule)).toBe(text);
  });
});

describe("hideUntilFor", () => {
  const start = at("2026-10-22T09:00:00");

  it.each([
    ["day-due", "2026-10-22T00:00:00"],
    ["1-day", "2026-10-21T00:00:00"],
    ["3-days", "2026-10-19T00:00:00"],
    ["1-week", "2026-10-15T00:00:00"],
    ["1-month", "2026-09-22T00:00:00"],
  ] as const)("hides until the start of the day, %s", (rule, iso) => {
    expect(hideUntilFor(start, rule)).toBe(seconds(iso));
  });
});

describe("review fixes", () => {
  it("accepts lowercase rules, any key order, and a lowercase prefix", () => {
    const start = at("2026-10-26T08:30:00");
    expect(normalizeRepeat("freq=weekly;byday=mo", start)).toBe("DTSTART:20261026T083000\nRRULE:FREQ=WEEKLY;BYDAY=MO");
    expect(normalizeRepeat("BYDAY=MO;FREQ=WEEKLY", start)).toBe("DTSTART:20261026T083000\nRRULE:BYDAY=MO;FREQ=WEEKLY");
    expect(normalizeRepeat("rrule:freq=daily", start)).toBe("DTSTART:20261026T083000\nRRULE:FREQ=DAILY");
  });

  it("moves the first occurrence for lowercase weekday rules too", () => {
    expect(firstOccurrence(at("2026-10-24T08:30:00"), "freq=weekly;byday=mo")).toEqual(at("2026-10-26T08:30:00"));
  });

  it("moves the first occurrence to the matching day of the month", () => {
    expect(firstOccurrence(at("2026-10-19T09:00:00"), "FREQ=MONTHLY;BYMONTHDAY=1")).toEqual(at("2026-11-01T09:00:00"));
  });

  it("moves the first occurrence to the matching month and day for yearly rules", () => {
    expect(firstOccurrence(at("2026-10-19T09:00:00"), "FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25")).toEqual(
      at("2026-12-25T09:00:00"),
    );
  });

  it("rejects rule parts it can't place correctly instead of saving a wrong schedule", () => {
    const start = at("2026-10-19T09:00:00");
    expect(() => normalizeRepeat("FREQ=MONTHLY;BYDAY=1MO", start)).toThrow(RepeatError);
    expect(() => normalizeRepeat("FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR", start)).toThrow(RepeatError);
  });

  it.each([
    ["RRULE:FREQ=MONTHLY;BYMONTHDAY=1", "Every month on day 1"],
    ["RRULE:FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25", "Every year on December 25"],
    ["RRULE:FREQ=DAILY;COUNT=5", "Every day, 5 times"],
    ["RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T000000", "Every week on Monday, until Dec 31, 2026"],
  ])("describes %j without dropping parts", (rule, text) => {
    expect(describeRepeat(rule)).toBe(text);
  });

  it("clamps 'a month before' to the end of a shorter month", () => {
    expect(hideUntilFor(at("2026-03-31T09:00:00"), "1-month")).toBe(seconds("2026-02-28T00:00:00"));
  });
});

describe("second review round", () => {
  it("re-anchors a stored rule without changing or validating it", () => {
    const stored = "DTSTART:20261002T090000\nRRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1";
    expect(reanchorRepeat(stored, at("2026-10-30T07:00:00"))).toBe(
      "DTSTART:20261030T070000\nRRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1",
    );
  });

  it.each([
    ["RRULE:FREQ=DAILY;BYMONTH=6", "Every day in June"],
    ["RRULE:FREQ=YEARLY;BYMONTHDAY=1", "Every year on day 1"],
    ["RRULE:FREQ=DAILY;BYMONTHDAY=1,15", "Every day on days 1 and 15"],
  ])("describes %j without dropping parts", (rule, text) => {
    expect(describeRepeat(rule)).toBe(text);
  });

  it("refuses rules that never produce a date", () => {
    expect(() => firstOccurrence(at("2026-10-19T09:00:00"), "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=30")).toThrow(
      RepeatError,
    );
  });
});

describe("third review round", () => {
  it("finds a leap day more than a year away", () => {
    expect(firstOccurrence(at("2026-10-19T09:00:00"), "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29")).toEqual(
      at("2028-02-29T09:00:00"),
    );
  });

  it.each([
    "DTSTART:20261030T090000\nRRULE:FREQ=MONTHLY;BYDAY=FR;BYSETPOS=-1",
    "RRULE:FREQ=MONTHLY;BYDAY=1MO",
    "RRULE:FREQ=WEEKLY;WKST=SU;BYDAY=MO",
  ])("shows rules it can't describe faithfully as they are, %j", (rule) => {
    expect(describeRepeat(rule)).toBe(rule.replace(/^.*RRULE:/s, ""));
  });
});
