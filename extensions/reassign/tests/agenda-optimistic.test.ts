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

const mk = (id: string, start: string, end: string): ScheduleEvent => ({ id, name: id, start, end });

it("forward shift reorders a row that crosses a back-to-back neighbor's start", () => {
  const events = [mk("a", "2026-09-22T09:00", "2026-09-22T09:10"), mk("b", "2026-09-22T09:10", "2026-09-22T09:20")];
  const out = transformEvents(events, { op: "shift", id: "a", byMinutes: 15 });
  expect(out.map((e) => e.start)).toEqual(["2026-09-22T09:10", "2026-09-22T09:15"]);
});

it("forward shift reorders even when the post-shift blocks do not overlap", () => {
  const events = [mk("a", "2026-09-22T09:00", "2026-09-22T09:30"), mk("b", "2026-09-22T09:05", "2026-09-22T09:10")];
  const out = transformEvents(events, { op: "shift", id: "a", byMinutes: 15 });
  expect(out.map((e) => e.start)).toEqual(["2026-09-22T09:05", "2026-09-22T09:15"]);
  const sorted = out.slice().sort((x, y) => x.start.localeCompare(y.start));
  expect(sorted[0].end <= sorted[1].start).toBe(true);
});

it("backward shift reorders a row that crosses a neighbor's start (mirror image)", () => {
  const events = [mk("a", "2026-09-22T09:00", "2026-09-22T09:10"), mk("b", "2026-09-22T09:05", "2026-09-22T09:15")];
  const out = transformEvents(events, { op: "shift", id: "b", byMinutes: -15 });
  expect(out.map((e) => e.start)).toEqual(["2026-09-22T08:50", "2026-09-22T09:00"]);
});

it("uses the same start-comparator as buildRangeAgenda on start-minute ties", () => {
  // Shift A onto B's start minute; both now start at 09:15. The optimistic
  // sort uses the same comparator as buildRangeAgenda, so the orderings agree.
  const events = [mk("a", "2026-09-22T09:00", "2026-09-22T09:10"), mk("b", "2026-09-22T09:15", "2026-09-22T09:25")];
  const out = transformEvents(events, { op: "shift", id: "a", byMinutes: 15 });
  const authoritative = events
    .map((e) => (e.id === "a" ? { ...e, start: "2026-09-22T09:15", end: "2026-09-22T09:25" } : e))
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start));
  expect(out.map((e) => e.id)).toEqual(authoritative.map((e) => e.id));
});

it("returns unaffected rows by reference on a real shift", () => {
  const a = mk("a", "2026-09-22T09:00", "2026-09-22T09:10");
  const b = mk("b", "2026-09-22T09:10", "2026-09-22T09:20");
  const c = mk("c", "2026-09-22T09:20", "2026-09-22T09:30");
  const out = transformEvents([a, b, c], { op: "shift", id: "a", byMinutes: 25 });
  expect(out.find((e) => e.id === "b")).toBe(b);
  expect(out.find((e) => e.id === "c")).toBe(c);
  expect(out.find((e) => e.id === "a")).not.toBe(a);
});

it("delete preserves the survivors' relative order", () => {
  const a = mk("a", "2026-09-22T09:00", "2026-09-22T09:10");
  const b = mk("b", "2026-09-22T09:10", "2026-09-22T09:20");
  const c = mk("c", "2026-09-22T09:20", "2026-09-22T09:30");
  const out = transformEvents([a, b, c], { op: "delete", id: "b" });
  expect(out.map((e) => e.id)).toEqual(["a", "c"]);
});

it("reflect does not re-sort and returns unrelated rows by reference", () => {
  // Input deliberately NOT in start order, to confirm reflect does not sort.
  const a = mk("a", "2026-09-22T09:10", "2026-09-22T09:20");
  const b = mk("b", "2026-09-22T09:00", "2026-09-22T09:10");
  const out = transformEvents([a, b], { op: "reflect", id: "a", status: "kept" });
  expect(out.map((e) => e.id)).toEqual(["a", "b"]);
  expect(out[1]).toBe(b);
  expect(out[0].reflect).toEqual({ status: "kept" });
});
