import { expect, it } from "vitest";
import { resolveBlockTiming } from "../src/lib/block-timing";
const start = new Date(2026, 8, 22, 9);
const end = new Date(2026, 8, 22, 11);
it("uses explicit boundaries even if an older hidden duration remains", () => {
  expect(resolveBlockTiming({ start, end, duration: "30m" })).toMatchObject({ kind: "exact", minutes: 120 });
});
it("derives the missing end", () => {
  expect(resolveBlockTiming({ start, end: null, duration: "2h" })).toMatchObject({ kind: "exact", end, minutes: 120 });
});
it("reads a compound duration with 60 or more minutes", () => {
  expect(resolveBlockTiming({ start, end: null, duration: "1h 60m" })).toMatchObject({
    kind: "exact",
    end,
    minutes: 120,
  });
});
it("derives the missing start", () => {
  expect(resolveBlockTiming({ start: null, end, duration: "2h" })).toMatchObject({
    kind: "exact",
    start,
    minutes: 120,
  });
});
it("keeps a date-only input as Inbox or a day for flexible placement", () => {
  expect(resolveBlockTiming({ start, end: null, duration: "", startFullDay: true })).toEqual({
    kind: "inbox",
    date: "2026-09-22",
  });
  expect(resolveBlockTiming({ start, end: null, duration: "90m", startFullDay: true })).toEqual({
    kind: "flexible",
    date: "2026-09-22",
    minutes: 90,
  });
});
it("allows an explicit midnight time", () => {
  expect(
    resolveBlockTiming({ start: new Date(2026, 8, 22), end: null, duration: "30m", startFullDay: false }),
  ).toMatchObject({ kind: "exact", minutes: 30 });
});
it("keeps overnight boundaries", () => {
  expect(
    resolveBlockTiming({ start: new Date(2026, 8, 22, 23), end: new Date(2026, 8, 23, 1), duration: "" }),
  ).toMatchObject({ kind: "exact", minutes: 120 });
});
it("rejects reversed ranges, date-only ends, invalid durations and overlong blocks", () => {
  for (const input of [
    { start: end, end: start, duration: "" },
    { start, end, endFullDay: true, duration: "" },
    { start, end: null, duration: "25h" },
    { start, end: null, duration: "nonsense" },
    { start: new Date("invalid"), end, duration: "" },
  ])
    expect(() => resolveBlockTiming(input)).toThrow();
});
it.each(["1h30", "1 hour 30 minutes", "1h 30m", "90 minutes"])("accepts readable duration %s", (duration) => {
  expect(resolveBlockTiming({ start, end: null, duration })).toMatchObject({ kind: "exact", minutes: 90 });
});
// The Duration field reads "1h 30" as 90 min. The capture fix for "1h 12 issues" must not drop these minutes.
it.each([
  ["1h 30", 90],
  ["1 hour 30", 90],
  ["2h 15", 135],
  ["1hr 45", 105],
  ["1h 30.", 90],
  ["1h30", 90],
  ["90m", 90],
  ["2 hours", 120],
])("keeps the minutes of the Duration field value %s", (duration, minutes) => {
  expect(resolveBlockTiming({ start, end: null, duration })).toMatchObject({ kind: "exact", minutes });
});
it("refuses a block shorter than the 5-minute server minimum", () => {
  expect(() => resolveBlockTiming({ start, end: null, duration: "4m" })).toThrow(/at least 5 minutes/);
  expect(resolveBlockTiming({ start, end: null, duration: "5m" })).toMatchObject({ kind: "exact", minutes: 5 });
});
it("refuses a derived start on a different day than the picked date", () => {
  expect(() =>
    resolveBlockTiming({
      start: new Date(2026, 8, 22),
      startFullDay: true,
      end: new Date(2026, 8, 22, 0, 30),
      duration: "2h",
    }),
  ).toThrow(/calculated start is on a different day/);
});
it("refuses a derived end in the DST spring-forward gap", () => {
  // Node reads a new TZ value at once, so the zone applies only inside this test.
  const saved = process.env.TZ;
  process.env.TZ = "Europe/Ljubljana";
  try {
    expect(new Date(2026, 2, 29, 12).getTimezoneOffset()).toBe(-120);
    expect(() => resolveBlockTiming({ start: new Date(2026, 2, 29, 1, 30), end: null, duration: "1h" })).toThrow(
      /does not exist on this day/,
    );
  } finally {
    if (saved === undefined) delete process.env.TZ;
    else process.env.TZ = saved;
  }
});
