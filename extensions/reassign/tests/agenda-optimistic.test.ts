import { expect, it } from "vitest";
import { transformEvents } from "../src/lib/agenda-optimistic";
import { eventRange, type ScheduleEvent } from "../src/lib/schedule-model";

const event: ScheduleEvent = {
  id: "b1",
  date: "2026-09-22",
  name: "Work",
  start: "09:00",
  end: "10:00",
  durationMinutes: 60,
};

it.each([
  { start: "22:45", end: "23:55", byMinutes: 15 },
  { start: "00:05", end: "00:20", byMinutes: -15 },
  { start: "23:50", end: "23:55", byMinutes: 15 },
  { start: "23:55", end: "00:10", endNextDay: true, byMinutes: 15 },
  { start: "23:55", end: "00:10", crossesMidnight: true, byMinutes: -15 },
  { start: "23:55", end: "00:10", byMinutes: 15 },
  { start: "00:00", end: "01:00", continuesFromPrevDay: true, byMinutes: 15 },
  { start: "22:00", end: "24:00", endsAtDayBoundary: true, byMinutes: -15 },
  { start: "09:00", end: "09:00", endNextDay: true, byMinutes: 15 },
])("waits for authoritative date and overnight rows when shifting %j", ({ byMinutes, ...times }) => {
  const original = { ...event, ...times };
  const shifted = transformEvents([original], { op: "shift", id: event.id, byMinutes });
  expect(shifted[0]).toBe(original);
});

it.each([15, -15])("optimistically shifts an ordinary same-day row by %s minutes", (byMinutes) => {
  const [shifted] = transformEvents([event], { op: "shift", id: event.id, byMinutes });
  expect(eventRange(shifted)).toEqual({ start: 540 + byMinutes, end: 600 + byMinutes });
  expect(shifted.date).toBe(event.date);
  expect(event.start).toBe("09:00");
});

it("keeps reflect and delete updates, and leaves unrelated events alone", () => {
  const other = { ...event, id: "other" };
  expect(transformEvents([event, other], { op: "delete", id: event.id })).toEqual([other]);
  const reflected = transformEvents([event, other], { op: "reflect", id: event.id, status: "kept" });
  expect(reflected[0].reflect).toEqual({ state: "kept", status: "kept" });
  expect(reflected[1]).toBe(other);
});
