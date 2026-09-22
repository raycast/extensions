import { expect, it } from "vitest";
import { addMinutesHM, formatRange } from "../src/lib/format";
import { eventRange, type ScheduleEvent } from "../src/lib/schedule-model";

function makeEvent(overrides: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return {
    id: "b1",
    date: "2026-09-22",
    start: "22:45",
    end: "23:55",
    durationMinutes: 70,
    name: "Deep work",
    endNextDay: false,
    crossesMidnight: false,
    ...overrides,
  };
}

// Replays the optimistic ±15-minute shift transform from src/agenda.tsx
// (transformEvents): it rewrites only start/end via addMinutesHM and leaves the
// endNextDay / crossesMidnight flags untouched.
function optimisticShift(event: ScheduleEvent, byMinutes: number): ScheduleEvent {
  return {
    ...event,
    start: addMinutesHM(event.start, byMinutes),
    end: addMinutesHM(event.end, byMinutes),
  };
}

it("flags +1 after an optimistic shift wraps end past midnight while start stays same-day", () => {
  const shifted = optimisticShift(makeEvent({ start: "22:45", end: "23:55" }), 15);
  expect(shifted).toMatchObject({ start: "23:00", end: "00:10", endNextDay: false, crossesMidnight: false });
  // eventRange extends end past midnight; formatRange must agree and print +1.
  expect(eventRange(shifted)).toEqual({ start: 23 * 60, end: 24 * 60 + 10 });
  expect(formatRange(shifted)).toBe("23:00 → 00:10 +1");
});

it("flags +1 after an optimistic shift wraps start to the previous day", () => {
  const shifted = optimisticShift(makeEvent({ start: "00:05", end: "00:20" }), -15);
  expect(shifted).toMatchObject({ start: "23:50", end: "00:05" });
  expect(eventRange(shifted)).toEqual({ start: 23 * 60 + 50, end: 24 * 60 + 5 });
  expect(formatRange(shifted)).toBe("23:50 → 00:05 +1");
});

it("does not add +1 for a same-day or zero-length block", () => {
  expect(formatRange(makeEvent({ start: "09:00", end: "10:00" }))).toBe("09:00 → 10:00");
  expect(formatRange(makeEvent({ start: "12:00", end: "12:00" }))).toBe("12:00 → 12:00");
  // A zero-length marker stays zero-length in eventRange (it is not extended to 24h).
  expect(eventRange(makeEvent({ start: "12:00", end: "12:00" }))).toEqual({ start: 12 * 60, end: 12 * 60 });
});

it("keeps +1 from explicit flags, including after an optimistic shift", () => {
  expect(formatRange(makeEvent({ start: "22:00", end: "01:30", endNextDay: true }))).toBe("22:00 → 01:30 +1");
  expect(formatRange(makeEvent({ start: "22:00", end: "01:30", crossesMidnight: true }))).toBe("22:00 → 01:30 +1");
  const shifted = optimisticShift(makeEvent({ start: "22:00", end: "01:30", endNextDay: true }), 15);
  expect(formatRange(shifted)).toBe("22:15 → 01:45 +1");
});

// The core invariant: formatRange and eventRange must never disagree on whether
// a block is overnight. This is the silent display/model divergence that hid the
// original bug; both functions must key off the same predicate.
it.each([
  { start: "22:00", end: "01:30", endNextDay: true, crossesMidnight: false },
  { start: "22:00", end: "01:30", endNextDay: false, crossesMidnight: true },
  { start: "23:00", end: "00:10", endNextDay: false, crossesMidnight: false },
  { start: "09:00", end: "10:00", endNextDay: false, crossesMidnight: false },
  { start: "12:00", end: "12:00", endNextDay: false, crossesMidnight: false },
])("formatRange and eventRange agree on overnight: %j", (event) => {
  const e = makeEvent(event);
  const overnight = eventRange(e)!.end >= 24 * 60;
  expect(formatRange(e).endsWith(" +1")).toBe(overnight);
});
