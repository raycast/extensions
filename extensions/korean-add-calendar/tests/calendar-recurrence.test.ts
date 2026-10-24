import { describe, expect, it } from "vitest";

import {
  buildRecurrenceForSubmit,
  defaultRecurrenceUntil,
  getRecurrenceDateWindow,
  prepareCalendarBatchForSubmit,
} from "../src/lib/calendar-recurrence";
import type { ParsedBatchItem } from "../src/lib/parse-korean-schedule-batch";
import type { ParsedSchedule } from "../src/lib/parse-korean-schedule";

describe("calendar recurrence submission", () => {
  it("aligns an inclusive end date to the recurring event time", () => {
    const parsed = makeRecurringSchedule(new Date(2026, 1, 17, 16, 30));
    const recurrence = buildRecurrenceForSubmit(parsed, {
      recurrenceEndType: "until",
      recurrenceCount: "10",
      recurrenceUntil: new Date(2026, 2, 31),
    });

    expect(recurrence).not.toBeInstanceOf(Error);
    if (!recurrence || recurrence instanceof Error || recurrence.end.type !== "until") return;
    expect(new Date(recurrence.end.untilEpochMs)).toEqual(new Date(2026, 2, 31, 16, 30));
  });

  it("accepts the same calendar day as the recurrence start", () => {
    const parsed = makeRecurringSchedule(new Date(2026, 1, 17, 16, 30));
    const recurrence = buildRecurrenceForSubmit(parsed, {
      recurrenceEndType: "until",
      recurrenceCount: "10",
      recurrenceUntil: new Date(2026, 1, 17),
    });

    expect(recurrence).not.toBeInstanceOf(Error);
  });

  it.each(["10events", "1.5", "1e2", ""])('rejects a non-integer occurrence count: "%s"', (recurrenceCount) => {
    const parsed = makeRecurringSchedule(new Date(2026, 1, 17, 16, 30));
    const recurrence = buildRecurrenceForSubmit(parsed, {
      recurrenceEndType: "count",
      recurrenceCount,
      recurrenceUntil: null,
    });

    expect(recurrence).toEqual(new Error("Recurrence count must be between 1 and 50."));
  });

  it("rejects recurrence end dates beyond one year", () => {
    const parsed = makeRecurringSchedule(new Date(2026, 1, 17, 16, 30));
    const recurrence = buildRecurrenceForSubmit(parsed, {
      recurrenceEndType: "until",
      recurrenceCount: "10",
      recurrenceUntil: new Date(2027, 1, 18),
    });

    expect(recurrence).toEqual(new Error("Recurrence end date must be within 1 year of the start date."));
  });

  it("calculates a shared date window for recurring batch items", () => {
    const first = makeBatchItem(makeRecurringSchedule(new Date(2026, 1, 17, 16, 30)));
    const second = makeBatchItem(makeRecurringSchedule(new Date(2026, 2, 3, 9, 0)));
    const window = getRecurrenceDateWindow([first, second]);

    expect(window?.min).toEqual(new Date(2026, 2, 3));
    expect(window?.max).toEqual(new Date(2027, 1, 17));
  });

  it("clamps the default three-month end date at month end", () => {
    expect(defaultRecurrenceUntil(new Date(2026, 0, 31, 12, 0))).toEqual(new Date(2026, 3, 30));
  });

  it("validates every recurrence before returning any writable batch item", () => {
    const first = makeBatchItem({
      ...makeRecurringSchedule(new Date(2026, 1, 17, 16, 30)),
      recurrence: undefined,
    });
    const second = makeBatchItem(makeRecurringSchedule(new Date(2026, 1, 18, 16, 30)));

    const result = prepareCalendarBatchForSubmit(
      [first, second],
      {
        recurrenceEndType: "count",
        recurrenceCount: "51",
        recurrenceUntil: null,
      },
      "B1 Meeting Room",
    );

    expect(result).toEqual(new Error("Recurrence count must be between 1 and 50."));
  });

  it("applies a manual location during batch preflight", () => {
    const item = makeBatchItem(makeRecurringSchedule(new Date(2026, 1, 17, 16, 30)));
    const result = prepareCalendarBatchForSubmit(
      [item],
      {
        recurrenceEndType: "count",
        recurrenceCount: "10",
        recurrenceUntil: null,
      },
      " B1 Meeting Room ",
    );

    expect(result).not.toBeInstanceOf(Error);
    if (result instanceof Error) return;
    expect(result[0]?.parsed.location).toBe("B1 Meeting Room");
    expect(result[0]?.recurrence?.end).toEqual({ type: "count", count: 10 });
  });
});

function makeRecurringSchedule(start: Date): ParsedSchedule {
  return {
    title: "Meeting",
    start,
    end: new Date(start.getTime() + 60 * 60 * 1000),
    allDay: false,
    source: "매주 화요일 오후 4시 30분 회의",
    intent: "event",
    recurrence: {
      frequency: "weekly",
      weekday: 2,
    },
  };
}

function makeBatchItem(value: ParsedSchedule): ParsedBatchItem {
  return {
    input: value.source,
    value,
    inheritedDate: false,
  };
}
