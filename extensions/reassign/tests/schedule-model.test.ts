import { expect, it } from "vitest";
import { addDaysISO } from "../src/lib/format";
import {
  buildTodayModel,
  buildMenuBarModel,
  buildRangeAgenda,
  homeCalendarId,
  isRecurring,
  isTailRow,
  nowWallClock,
  occurrenceTarget,
  type Now,
  type ScheduleEvent,
  type ScheduleResponse,
} from "../src/lib/schedule-model";

// Guards the DayView stale-data leak: `useCachedPromise(getSchedule, [date],
// { keepPreviousData: true })` briefly holds the *previous* day's single-day
// payload while a new, uncached date is in flight. `buildTodayModel` must not
// borrow another day's events for the requested date — it returns null so
// DayView renders its loading state instead of wrong-day rows.

function makeNow(date: string, clock = "10:30"): Now {
  return `${date}T${clock}`;
}

function makeEvent(
  date: string,
  id: string,
  start: string,
  end: string,
  extra: Partial<ScheduleEvent> = {},
): ScheduleEvent {
  // A clock-only end at or before the start runs to the next day.
  return {
    id,
    start: `${date}T${start}`,
    end: `${end > start ? date : addDaysISO(date, 1)}T${end}`,
    name: id,
    ...extra,
  };
}

const allEvents = (model: NonNullable<ReturnType<typeof buildTodayModel>>): ScheduleEvent[] => [
  ...model.sections.now,
  ...model.sections.upNext,
  ...model.sections.later,
  ...model.sections.done,
];

const dayA = "2026-09-22";
const dayB = addDaysISO(dayA, 1); // "2026-09-23"

it("returns null when the requested date is absent (the stale-data window)", () => {
  const staleDayAPayload: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA),
    days: [
      {
        date: dayA,
        events: [makeEvent(dayA, "Standup", "09:00", "10:00"), makeEvent(dayA, "Deep work", "10:00", "11:00")],
      },
    ],
    areas: [],
    activityTypes: [],
  };
  expect(buildTodayModel(staleDayAPayload, dayB)).toBeNull();
});

it("returns null for an empty days array", () => {
  const payload: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA),
    days: [],
    areas: [],
    activityTypes: [],
  };
  expect(buildTodayModel(payload, dayA)).toBeNull();
});

it("picks the requested day out of a multi-day payload and never borrows another day's events", () => {
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA, "10:30"),
    days: [
      { date: dayA, events: [makeEvent(dayA, "DayA-only", "09:00", "10:00")] },
      { date: dayB, events: [makeEvent(dayB, "DayB-only", "11:00", "12:00")] },
    ],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, dayB);
  expect(model).not.toBeNull();
  expect(allEvents(model!).map((e) => e.name)).toEqual(["DayB-only"]);
  expect(allEvents(model!).every((e) => e.start.startsWith(dayB))).toBe(true);
});

it("treats a present-but-empty day as an empty model, not null", () => {
  // DayView distinguishes missing (loading) from present-empty ("Nothing
  // planned"); the fix must not collapse these by returning null for an empty
  // but present day.
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayB),
    days: [{ date: dayB, events: [] }],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, dayB);
  expect(model).not.toBeNull();
  expect(allEvents(model!)).toEqual([]);
});

it("buckets a today by the live clock into now / upNext / later / done", () => {
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA, "10:30"),
    days: [
      {
        date: dayA,
        events: [
          makeEvent(dayA, "reflected", "08:00", "09:00", { reflect: { status: "kept" } }),
          makeEvent(dayA, "past", "09:00", "10:00"),
          makeEvent(dayA, "current", "10:00", "11:00"),
          makeEvent(dayA, "next", "11:00", "12:00"),
          makeEvent(dayA, "later1", "13:00", "14:00"),
          makeEvent(dayA, "later2", "15:00", "16:00"),
        ],
      },
    ],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, dayA);
  expect(model).not.toBeNull();
  expect(model!.sections.now.map((e) => e.name)).toEqual(["current"]);
  expect(model!.sections.upNext.map((e) => e.name)).toEqual(["next"]);
  expect(model!.sections.later.map((e) => e.name)).toEqual(["later1", "later2"]);
  expect(model!.sections.done.map((e) => e.name).sort()).toEqual(["past", "reflected"]);
});

it("does not bucket a non-today present day against the payload's live clock", () => {
  // The bug's secondary symptom was "Now / Up next" computed against the
  // previous day's clock under a non-today header. A present non-today day
  // must have an empty "now" regardless of currentClock.
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA, "10:30"),
    days: [
      {
        date: dayB,
        events: [makeEvent(dayB, "morning", "09:00", "10:00"), makeEvent(dayB, "noon", "12:00", "13:00")],
      },
    ],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, dayB);
  expect(model).not.toBeNull();
  expect(model!.sections.now).toEqual([]);
  expect(model!.sections.upNext.map((e) => e.name)).toEqual(["morning"]);
  expect(model!.sections.later.map((e) => e.name)).toEqual(["noon"]);
});

it("reads the wall clock straight from `now`", () => {
  expect(nowWallClock("2026-09-23T00:30")).toEqual({ date: "2026-09-23", minutes: 30, local: "2026-09-23T00:30" });
});

it("puts a tail row from the previous day in Now while it runs", () => {
  const tail = makeEvent(addDaysISO(dayA, -1), "overnight", "22:00", "01:00");
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA, "00:30"),
    days: [{ date: dayA, events: [tail, makeEvent(dayA, "breakfast", "08:00", "09:00")] }],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, dayA)!;
  expect(model.sections.now.map((e) => e.name)).toEqual(["overnight"]);
  expect(model.sections.upNext.map((e) => e.name)).toEqual(["breakfast"]);
});

it("drops a tail row when its start row is in the range, and keeps an orphan tail", () => {
  const overnight = makeEvent(dayA, "overnight", "22:00", "01:00");
  const orphan = makeEvent(addDaysISO(dayA, -1), "orphan", "23:00", "02:00");
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA),
    days: [
      { date: dayA, events: [orphan, overnight] },
      { date: dayB, events: [overnight] },
    ],
    areas: [],
    activityTypes: [],
  };
  const [a, b] = buildRangeAgenda(schedule, [dayA, dayB]);
  expect(a.events.map((e) => e.name)).toEqual(["orphan", "overnight"]);
  expect(b.events).toEqual([]);
  expect(isTailRow(orphan, dayA)).toBe(true);
  expect(isTailRow(overnight, dayA)).toBe(false);
});

it("addresses an occurrence, the later blocks, or the whole series", () => {
  expect(occurrenceTarget("s@2026-09-22", "this")).toEqual({ id: "s@2026-09-22" });
  expect(occurrenceTarget("s@2026-09-22", "future")).toEqual({ id: "s@2026-09-22", scope: "future" });
  expect(occurrenceTarget("s@2026-09-22", "all")).toEqual({ id: "s" });
  expect(occurrenceTarget("plain", "all")).toEqual({ id: "plain" });
  // A changed occurrence reads as seriesId@originalDate, with no recurrence.
  expect(isRecurring(makeEvent(dayB, "s@2026-09-22", "14:00", "15:00"))).toBe(true);
  expect(isRecurring(makeEvent(dayA, "s@2026-09-22", "09:00", "10:00"))).toBe(true);
  expect(isRecurring(makeEvent(dayA, "plain", "09:00", "10:00"))).toBe(false);
});

it("reads a missing calendarId as the default calendar and null as Reassign only", () => {
  expect(homeCalendarId({}, "default")).toBe("default");
  expect(homeCalendarId({}, undefined)).toBeNull();
  expect(homeCalendarId({ calendarId: null }, "default")).toBeNull();
  expect(homeCalendarId({ calendarId: "work" }, "default")).toBe("work");
});

it("never puts another day's events on today's clock in the menu bar", () => {
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayB, "10:30"),
    days: [{ date: dayA, events: [makeEvent(dayA, "yesterday", "10:00", "11:00")] }],
    areas: [],
    activityTypes: [],
  };
  const model = buildMenuBarModel(schedule);
  expect(model.current).toBeNull();
  expect(model.upcoming).toEqual([]);
});
