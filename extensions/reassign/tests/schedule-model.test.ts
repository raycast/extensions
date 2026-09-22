import { expect, it } from "vitest";
import { addDaysISO } from "../src/lib/format";
import { buildTodayModel, type Now, type ScheduleEvent, type ScheduleResponse } from "../src/lib/schedule-model";

// Guards the DayView stale-data leak: `useCachedPromise(getSchedule, [date],
// { keepPreviousData: true })` briefly holds the *previous* day's single-day
// payload while a new, uncached date is in flight. `buildTodayModel` must not
// borrow another day's events for the requested date — it returns null so
// DayView renders its loading state instead of wrong-day rows.

function makeNow(date: string, clock = "10:30"): Now {
  return {
    iso: date,
    todayIso: date,
    weekday: "Mon",
    currentHour: Number(clock.split(":")[0]),
    currentClock: clock,
    timezone: "UTC",
    offset: "+00:00",
  };
}

function makeEvent(
  date: string,
  id: string,
  start: string,
  end: string,
  extra: Partial<ScheduleEvent> = {},
): ScheduleEvent {
  return {
    id,
    date,
    start,
    end,
    durationMinutes: (Number(end.split(":")[0]) - Number(start.split(":")[0])) * 60,
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
    now: makeNow(dayA),
    days: [
      {
        date: dayA,
        weekday: "Mon",
        events: [makeEvent(dayA, "Standup", "09:00", "10:00"), makeEvent(dayA, "Deep work", "10:00", "11:00")],
      },
    ],
    areas: [],
    activityTypes: [],
  };
  expect(buildTodayModel(staleDayAPayload, dayB)).toBeNull();
});

it("returns null for an empty days array", () => {
  const payload: ScheduleResponse = { now: makeNow(dayA), days: [], areas: [], activityTypes: [] };
  expect(buildTodayModel(payload, dayA)).toBeNull();
});

it("picks the requested day out of a multi-day payload and never borrows another day's events", () => {
  const schedule: ScheduleResponse = {
    now: makeNow(dayA, "10:30"),
    days: [
      { date: dayA, weekday: "Mon", events: [makeEvent(dayA, "DayA-only", "09:00", "10:00")] },
      { date: dayB, weekday: "Tue", events: [makeEvent(dayB, "DayB-only", "11:00", "12:00")] },
    ],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, dayB);
  expect(model).not.toBeNull();
  expect(allEvents(model!).map((e) => e.name)).toEqual(["DayB-only"]);
  expect(allEvents(model!).every((e) => e.date === dayB)).toBe(true);
});

it("treats a present-but-empty day as an empty model, not null", () => {
  // DayView distinguishes missing (loading) from present-empty ("Nothing
  // planned"); the fix must not collapse these by returning null for an empty
  // but present day.
  const schedule: ScheduleResponse = {
    now: makeNow(dayB),
    days: [{ date: dayB, weekday: "Tue", events: [] }],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, dayB);
  expect(model).not.toBeNull();
  expect(allEvents(model!)).toEqual([]);
});

it("buckets a today by the live clock into now / upNext / later / done", () => {
  const schedule: ScheduleResponse = {
    now: makeNow(dayA, "10:30"),
    days: [
      {
        date: dayA,
        weekday: "Mon",
        events: [
          makeEvent(dayA, "reflected", "08:00", "09:00", { reflect: { state: "kept" } }),
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
    now: makeNow(dayA, "10:30"),
    days: [
      {
        date: dayB,
        weekday: "Tue",
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
