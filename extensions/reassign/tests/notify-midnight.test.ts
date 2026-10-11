import { beforeEach, expect, it, vi } from "vitest";

// Direct coverage for `maybeNotifyTransitions` (src/lib/notify.ts), which had
// none: `now.test.tsx` mocks the whole module away and `forms.test.tsx`
// disables the pref. Only `LocalStorage` and `runAppleScript` are mocked —
// the two surfaces the module touches — so the real notify code path runs.

const shared = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  removed: new Array<string>(),
  runAppleScript: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  LocalStorage: {
    allItems: async () => Object.fromEntries(shared.storage),
    getItem: async (k: string) => shared.storage.get(k),
    setItem: async (k: string, v: string) => {
      shared.storage.set(k, v);
    },
    removeItem: async (k: string) => {
      shared.storage.delete(k);
      shared.removed.push(k);
    },
  },
}));

vi.mock("@raycast/utils", () => ({
  runAppleScript: shared.runAppleScript,
}));

import { addDaysISO } from "../src/lib/format";
import { type ScheduleDay, type ScheduleEvent, type ScheduleResponse } from "../src/lib/schedule-model";
import { maybeNotifyTransitions } from "../src/lib/notify";

const DAY = "2026-09-28"; // account-today during the pre-midnight tick
const NEXT = addDaysISO(DAY, 1); // account-tomorrow, where an early block lives

function makeEvent(
  date: string,
  id: string,
  start: string,
  end: string,
  extra: Partial<ScheduleEvent> = {},
): ScheduleEvent {
  return { id, start: `${date}T${start}`, end: `${date}T${end}`, name: id, ...extra };
}

function makeSchedule(now: string, days: ScheduleDay[]): ScheduleResponse {
  return { now, timezone: "UTC", days, areas: [], activityTypes: [] };
}

/** The notification bodies handed to `runAppleScript`, in call order. */
function bodies(): string[] {
  return shared.runAppleScript.mock.calls
    .map((c) => (c[0] as string).match(/display notification "([^"]*)"/)?.[1])
    .filter((b): b is string => Boolean(b));
}

beforeEach(() => {
  shared.storage.clear();
  shared.removed.length = 0;
  shared.runAppleScript.mockReset();
});

it("a same-day block fires its 'lead' heads-up then its 'start' ping", async () => {
  // Baseline for the previously-untested module. now 10:25 → lead 15 → lead;
  // now 10:35 → lead 5 → start.
  const event = makeEvent(DAY, "standup", "10:40", "11:00", { kind: "blocking" });
  await maybeNotifyTransitions(makeSchedule(`${DAY}T10:25`, [{ date: DAY, events: [event] }]));
  await maybeNotifyTransitions(makeSchedule(`${DAY}T10:35`, [{ date: DAY, events: [event] }]));
  expect(bodies()).toEqual(["Coming up at 10:40", "Starts at 10:40"]);
});

it("a 00:05 block on the next-day entry fires its 'lead' heads-up at the 23:50 tick", async () => {
  // The bug: the block's lead band (start−20, start−10] = (23:45, 23:55] sits
  // before account midnight, so during the 23:50 tick the block lives on
  // account-tomorrow's entry. Walking only account-today missed it.
  const schedule = makeSchedule(`${DAY}T23:50`, [
    { date: DAY, events: [] },
    { date: NEXT, events: [makeEvent(NEXT, "early", "00:05", "00:30", { name: "Early call", kind: "blocking" })] },
  ]);
  await maybeNotifyTransitions(schedule);
  expect(bodies()).toEqual(["Coming up at 00:05"]);
  // The key carries the block's own date, so it survives the rollover prune.
  expect(shared.storage.has(`notified:${NEXT}:early:00:05:lead`)).toBe(true);
});

it("iterating account-tomorrow does not over-fire: a daytime block there stays quiet at 23:50", async () => {
  const schedule = makeSchedule(`${DAY}T23:50`, [
    { date: DAY, events: [] },
    { date: NEXT, events: [makeEvent(NEXT, "lunch", "14:00", "15:00", { kind: "blocking" })] },
  ]);
  await maybeNotifyTransitions(schedule);
  expect(bodies()).toEqual([]);
});

it("a straddle block (00:15) does not fire early at the 23:50 tick (its lead band is post-midnight)", async () => {
  // start 00:15 → lead 25 at 23:50 → null. The fix must reach account-tomorrow
  // without pinging every block on it.
  const schedule = makeSchedule(`${DAY}T23:50`, [
    { date: DAY, events: [] },
    { date: NEXT, events: [makeEvent(NEXT, "straddle", "00:15", "00:45", { kind: "blocking" })] },
  ]);
  await maybeNotifyTransitions(schedule);
  expect(bodies()).toEqual([]);
});

it("after account midnight the start ping fires once and the lead key is kept", async () => {
  // The lead heads-up already fired at 23:50, keyed on the block's own date.
  const leadKey = `notified:${NEXT}:early:00:05:lead`;
  shared.storage.set(leadKey, "1");
  const schedule = makeSchedule(`${NEXT}T00:00`, [
    { date: DAY, events: [] },
    { date: NEXT, events: [makeEvent(NEXT, "early", "00:05", "00:30", { kind: "blocking" })] },
  ]);
  await maybeNotifyTransitions(schedule);
  expect(bodies()).toEqual(["Starts at 00:05"]);
  expect(shared.removed).not.toContain(leadKey);
  expect(shared.storage.has(`notified:${NEXT}:early:00:05:start`)).toBe(true);
});

it("a 00:03 block fires one 'Starts at' ping across ticks at 23:53 and 00:03", async () => {
  // Its start band [23:53, 00:03] spans account midnight. Both ticks fall in it,
  // so a key on today's date would fire it on each side of midnight.
  const event = makeEvent(NEXT, "early", "00:03", "00:30", { kind: "blocking" });
  const days = [
    { date: DAY, events: [] },
    { date: NEXT, events: [event] },
  ];
  await maybeNotifyTransitions(makeSchedule(`${DAY}T23:53`, days));
  await maybeNotifyTransitions(makeSchedule(`${NEXT}T00:03`, [...days, { date: addDaysISO(NEXT, 1), events: [] }]));
  expect(bodies()).toEqual(["Starts at 00:03"]);
});

it("irregular ticks across midnight fire each band of a 00:08 block at most once", async () => {
  // Lead band (23:48, 23:58], start band [23:58, 00:08]. Ticks bunch and skip.
  const event = makeEvent(NEXT, "early", "00:08", "00:30", { kind: "blocking" });
  const before = [
    { date: DAY, events: [] },
    { date: NEXT, events: [event] },
  ];
  const after = [...before, { date: addDaysISO(NEXT, 1), events: [] }];
  for (const clock of ["23:49", "23:51", "23:57"]) {
    await maybeNotifyTransitions(makeSchedule(`${DAY}T${clock}`, before));
  }
  for (const clock of ["00:01", "00:02", "00:07"]) {
    await maybeNotifyTransitions(makeSchedule(`${NEXT}T${clock}`, after));
  }
  expect(bodies()).toEqual(["Coming up at 00:08", "Starts at 00:08"]);
});

it("a band fires once across consecutive ticks in that band", async () => {
  const event = makeEvent(NEXT, "early", "00:05", "00:30", { kind: "blocking" });
  const build = (clock: string) =>
    makeSchedule(`${DAY}T${clock}`, [
      { date: DAY, events: [] },
      { date: NEXT, events: [event] },
    ]);
  await maybeNotifyTransitions(build("23:48"));
  await maybeNotifyTransitions(build("23:52"));
  expect(bodies()).toEqual(["Coming up at 00:05"]);
  expect(shared.runAppleScript).toHaveBeenCalledTimes(1);
});

it("a non-blocking block on account-tomorrow does not fire", async () => {
  // The new two-day iteration evaluates tomorrow's events; the blocking filter
  // must still apply to them.
  const schedule = makeSchedule(`${DAY}T23:50`, [
    { date: DAY, events: [] },
    { date: NEXT, events: [makeEvent(NEXT, "soft", "00:05", "00:30", { kind: "non_blocking" })] },
  ]);
  await maybeNotifyTransitions(schedule);
  expect(bodies()).toEqual([]);
});

it("a cross-midnight block on both day entries fires exactly once per tick", async () => {
  // A block that spans midnight is the start row on account-today and a tail
  // row on account-tomorrow — the payload shape `buildRangeAgenda` emits. The
  // dedup snapshot is read once per tick, so the tail-row filter must reference
  // the iterated day (`day.date`), not `todayIso`, or this fires twice.
  const spanning: ScheduleEvent = {
    id: "span",
    start: `${DAY}T23:55`,
    end: `${NEXT}T00:30`,
    name: "Span",
    kind: "blocking",
  };
  const schedule = makeSchedule(`${DAY}T23:50`, [
    { date: DAY, events: [spanning] },
    { date: NEXT, events: [spanning] },
  ]);
  await maybeNotifyTransitions(schedule);
  expect(bodies()).toEqual(["Starts at 23:55"]);
  expect(shared.runAppleScript).toHaveBeenCalledTimes(1);
});

it("prune removes earlier-day keys and keeps today's and tomorrow's, without touching un-prefixed keys", async () => {
  shared.storage.set(`notified:${DAY}:standup:10:40:start`, "1");
  shared.storage.set(`notified:${addDaysISO(DAY, -1)}:old:09:00:lead`, "1");
  shared.storage.set("reassign-session", "keep-me");
  const schedule = makeSchedule(`${DAY}T23:50`, [
    { date: DAY, events: [] },
    { date: NEXT, events: [makeEvent(NEXT, "early", "00:05", "00:30", { kind: "blocking" })] },
  ]);
  await maybeNotifyTransitions(schedule);
  expect(shared.removed).toContain(`notified:${addDaysISO(DAY, -1)}:old:09:00:lead`);
  expect(shared.storage.has(`notified:${DAY}:standup:10:40:start`)).toBe(true);
  expect(shared.storage.has(`notified:${NEXT}:early:00:05:lead`)).toBe(true);
  expect(shared.storage.has("reassign-session")).toBe(true);
});

it("an absent account-tomorrow entry does not crash and still walks account-today", async () => {
  // The >24h-timezone edge: account-tomorrow is outside the fetched window.
  const schedule: ScheduleResponse = {
    now: `${DAY}T10:35`,
    timezone: "UTC",
    days: [{ date: DAY, events: [makeEvent(DAY, "standup", "10:40", "11:00", { kind: "blocking" })] }],
    areas: [],
    activityTypes: [],
  };
  await maybeNotifyTransitions(schedule);
  expect(bodies()).toEqual(["Starts at 10:40"]);
});
