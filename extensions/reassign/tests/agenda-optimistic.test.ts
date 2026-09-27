import { expect, it } from "vitest";
import { transformEvents } from "../src/lib/agenda-optimistic";
import { eventRange, type ScheduleEvent } from "../src/lib/schedule-model";

const event: ScheduleEvent = {
  id: "b1",
  name: "Work",
  start: "2026-09-22T09:00",
  end: "2026-09-22T10:00",
};

const day = (clock: string) => `2026-09-22T${clock}`;
const next = (clock: string) => `2026-09-23T${clock}`;
const prev = (clock: string) => `2026-09-21T${clock}`;

it.each([
  { start: day("22:45"), end: day("23:55"), byMinutes: 15 },
  { start: day("00:05"), end: day("00:20"), byMinutes: -15 },
  { start: day("23:50"), end: day("23:55"), byMinutes: 15 },
  { start: day("23:55"), end: next("00:10"), byMinutes: -15 },
  { start: prev("23:00"), end: day("01:00"), byMinutes: 15 },
  { start: day("22:00"), end: next("00:00"), byMinutes: -15 },
  { start: day("09:00"), end: next("09:00"), byMinutes: 15 },
])("waits for authoritative date and overnight rows when shifting %j", ({ byMinutes, ...times }) => {
  const original = { ...event, ...times };
  const shifted = transformEvents([original], { op: "shift", id: event.id, byMinutes });
  expect(shifted[0]).toBe(original);
});

it.each([15, -15])("optimistically shifts an ordinary same-day row by %s minutes", (byMinutes) => {
  const [shifted] = transformEvents([event], { op: "shift", id: event.id, byMinutes });
  expect(eventRange(shifted)).toEqual({ start: 540 + byMinutes, end: 600 + byMinutes });
  expect(shifted.start.slice(0, 10)).toBe("2026-09-22");
  expect(event.start).toBe("2026-09-22T09:00");
});

it("keeps reflect and delete updates, and leaves unrelated events alone", () => {
  const other = { ...event, id: "other" };
  expect(transformEvents([event, other], { op: "delete", id: event.id })).toEqual([other]);
  const reflected = transformEvents([event, other], { op: "reflect", id: event.id, status: "kept" });
  expect(reflected[0].reflect).toEqual({ status: "kept" });
  expect(reflected[1]).toBe(other);
});
