import { expect, it } from "vitest";
import { addDaysISO } from "../src/lib/format";
import {
  buildTodayModel,
  buildMenuBarModel,
  buildRangeAgenda,
  collectAgendaFilters,
  eventMatchesFilter,
  homeCalendarId,
  isRecurring,
  isTailRow,
  nowWallClock,
  occurrenceTarget,
  type Now,
  type ScheduleEvent,
  type ScheduleResponse,
  type TodayModel,
} from "../src/lib/schedule-model";

// A response missing the requested date must not borrow another day's events.
// Returning null keeps missing dates distinct from present-but-empty days.

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

it("routes a past day's already-ended unreflected block to Done, not Up next", () => {
  // A strictly past day has no live "now", but its already-ended blocks are
  // "past but unreviewed — still check-off-able" — the same notion the
  // today-branch encodes. A reflected past-day block and an ended-but-unreflected
  // sibling both belong in Done, so the day renders under one header instead of
  // splitting already-happened blocks across "Done" and "Up next".
  const pastDay = addDaysISO(dayA, -1); // "2026-09-21"
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA, "10:30"), // 2026-09-22T10:30 — the day after pastDay
    days: [
      {
        date: pastDay,
        events: [
          makeEvent(pastDay, "past-unreflected", "09:00", "10:00"),
          makeEvent(pastDay, "past-reflected", "11:00", "12:00", { reflect: { status: "kept" } }),
        ],
      },
    ],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, pastDay);
  expect(model).not.toBeNull();
  expect(model!.sections.now).toEqual([]);
  expect(model!.sections.upNext).toEqual([]);
  expect(model!.sections.later).toEqual([]);
  expect(model!.sections.done.map((e) => e.name).sort()).toEqual(["past-reflected", "past-unreflected"]);
});

it("leaves a still-running overnight block on a past day in Up next, not Done", () => {
  // The fix only routes already-ended past-day blocks to Done. An overnight
  // block that started on the past day and is still running on the clock day
  // has not ended, so it stays upcoming — the disclosed limitation. "Now" is
  // never populated on a non-today view regardless.
  const pastDay = addDaysISO(dayA, -1); // "2026-09-21"
  const overnight = makeEvent(pastDay, "overnight", "23:30", "01:00"); // ends 2026-09-22T01:00
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA, "00:30"), // 2026-09-22T00:30 — overnight is still running
    days: [{ date: pastDay, events: [overnight] }],
    areas: [],
    activityTypes: [],
  };
  const model = buildTodayModel(schedule, pastDay);
  expect(model).not.toBeNull();
  expect(model!.sections.now).toEqual([]);
  expect(model!.sections.upNext.map((e) => e.name)).toEqual(["overnight"]);
  expect(model!.sections.later).toEqual([]);
  expect(model!.sections.done).toEqual([]);
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

it("keeps a tail row when its start row is on a fetched day that is not shown", () => {
  // The week fetches one extra day before the seven days that it shows.
  const dayBefore = addDaysISO(dayA, -1);
  const overnight = makeEvent(dayBefore, "overnight", "22:00", "01:00");
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA, "00:30"),
    days: [
      { date: dayBefore, events: [overnight] },
      { date: dayA, events: [overnight] },
    ],
    areas: [],
    activityTypes: [],
  };
  const [a] = buildRangeAgenda(schedule, [dayA, dayB]);
  expect(a.events.map((e) => e.name)).toEqual(["overnight"]);
});

// A multi-day block: start row on a fetched-but-hidden day, with a tail on
// every spanned shown day. Pre-fix this duplicated once per spanned shown day.
function multiDayEvent(
  startISO: string,
  endISO: string,
  id: string,
  extra: Partial<ScheduleEvent> = {},
): ScheduleEvent {
  return { id, name: id, start: `${startISO}T22:00`, end: `${endISO}T02:00`, ...extra };
}

it("collapses a block that starts on a fetched-but-hidden day to one appearance across multiple shown days", () => {
  // Regression for d915aa6: the fix narrowed `startIds` to shown dates, so a
  // 3+ day block whose start row sits on a hidden fetched day survived on
  // every spanned shown day and rendered under multiple day headers.
  const dayBefore = addDaysISO(dayA, -1);
  const dayC = addDaysISO(dayA, 2);
  const long = multiDayEvent(dayBefore, dayC, "long");
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA),
    days: [
      { date: dayBefore, events: [long] },
      { date: dayA, events: [long] },
      { date: dayB, events: [long] },
    ],
    areas: [],
    activityTypes: [],
  };
  const [a, b] = buildRangeAgenda(schedule, [dayA, dayB]);
  expect(a.events.map((e) => e.name)).toEqual(["long"]);
  expect(b.events).toEqual([]);
  expect(a.events.length + b.events.length).toBe(1);
});

it("collapses a long block whose start row is outside the fetched window", () => {
  // A block whose start row sits outside the entire fetched window carries
  // only tail rows into the range; it should appear once on the first shown
  // day it overlaps, not once per spanned shown day.
  const dayBeforeFetch = addDaysISO(dayA, -2);
  const dayC = addDaysISO(dayA, 2);
  const long = multiDayEvent(dayBeforeFetch, dayC, "long");
  const schedule: ScheduleResponse = {
    timezone: "Europe/Ljubljana",
    now: makeNow(dayA),
    days: [
      { date: dayA, events: [long] },
      { date: dayB, events: [long] },
    ],
    areas: [],
    activityTypes: [],
  };
  const [a, b] = buildRangeAgenda(schedule, [dayA, dayB]);
  expect(a.events.map((e) => e.name)).toEqual(["long"]);
  expect(b.events).toEqual([]);
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

// The Agenda area/activity dropdown reads these two helpers.
const areaA = { id: "a", name: "Work", color: "#f00" };
const areaB = { id: "b", name: "Home", color: "#0f0" };
const deep = { id: "deep", name: "Deep work" };
const filterEvents = {
  a1: makeEvent(dayA, "a1", "09:00", "10:00", { areaId: "a", activityTypeId: "deep" }),
  b1: makeEvent(dayA, "b1", "11:00", "12:00", { areaId: "b" }),
  a2: makeEvent(dayA, "a2", "13:00", "14:00", { areaId: "a", activityTypeId: "deep" }),
  gone: makeEvent(dayA, "gone", "15:00", "16:00", { areaId: "deleted", activityTypeId: "deleted" }),
};
const filterModel: TodayModel = {
  now: makeNow(dayA),
  areas: [areaA, areaB],
  activityTypes: [deep],
  sections: { now: [filterEvents.a1], upNext: [filterEvents.b1], later: [filterEvents.gone], done: [filterEvents.a2] },
  freeSlots: [],
};

it("collects each area and activity once, in section order", () => {
  expect(collectAgendaFilters(filterModel)).toEqual({ areas: [areaA, areaB], activities: [deep] });
});

it.each([
  ["all", "b1", true],
  ["nocolon", "b1", true],
  ["area:a", "a1", true],
  ["area:a", "b1", false],
  ["area:b", "b1", true],
  ["activity:deep", "a2", true],
  ["activity:deep", "b1", false],
  ["area:deleted", "gone", false],
  ["activity:deleted", "gone", false],
])("eventMatchesFilter(%s) for %s is %s", (filter, id, expected) => {
  const event = filterEvents[id as keyof typeof filterEvents];
  expect(eventMatchesFilter(event, filterModel, filter)).toBe(expected);
});
