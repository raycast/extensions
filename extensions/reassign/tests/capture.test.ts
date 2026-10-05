import { expect, it } from "vitest";
import { parseCapture } from "../src/lib/nl-parse";
const ref = new Date(2026, 8, 21, 12);
it.each([
  ["deep work tomorrow 9am-11am", "09:00", "11:00", 120],
  ["work tomorrow 11pm-1am", "23:00", "01:00", 120],
  ["work tomorrow 9am for 90m", "09:00", "10:30", 90],
  ["work tomorrow 9am", "09:00", "09:30", 30],
])("preserves the preview duration for %s", (input, start, end, durationMinutes) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", start, end, durationMinutes });
});

it.each([
  ["work tomorrow noon-1pm", "12:00", "13:00", 60, "work", "2026-09-22"],
  ["work midnight-2am", "00:00", "02:00", 120, "work", "2026-09-22"],
  ["Noon-1PM", "12:00", "13:00", 60, "", "2026-09-21"],
])(
  "parses a hyphenated range whose start is noon/midnight for %s",
  (input, start, end, durationMinutes, name, date) => {
    expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", start, end, durationMinutes, name, date });
  },
);

it.each([
  ["noon to 1pm", "12:00", "13:00", 60, ""],
  ["lunch at noon", "12:00", "12:30", 30, "lunch"],
  ["noon meeting at 3pm", "12:00", "12:30", 30, "meeting 3pm"],
])("preserves prose noon/midnight parsing for %s", (input, start, end, durationMinutes, name) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", start, end, durationMinutes, name });
});

it.each([
  ["call tomorrow 3pm about noon menu", "call about noon menu", "15:00", "15:30", 30],
  ["watch tomorrow 3pm Midnight Run", "watch Midnight Run", "15:00", "15:30", 30],
  ["work tomorrow midnight-2am then noon review", "work then noon review", "00:00", "02:00", 120],
  ["work tomorrow 11pm-midnight", "work", "23:00", "00:00", 60],
  ["work tomorrow noon-midnight", "work", "12:00", "00:00", 720],
])("preserves the original title around normalized time words for %s", (input, name, start, end, durationMinutes) => {
  expect(parseCapture(input, ref)).toMatchObject({ name, start, end, durationMinutes, date: "2026-09-22" });
});

it.each([
  ["focus 2h 2h", "focus", 120],
  ["block 1h 1h", "block", 60],
  ["gym 45m then 45m cardio", "gym then cardio", 45],
  ["review 1h30 1h30 notes", "review notes", 90],
  ["focus 2h then 12h fast", "focus then fast", 120],
  ["run 5m warmup then 15m", "run warmup then", 5],
  ["focus 2h and 2hrs", "focus and", 120],
  ["focus 2h then 3h", "focus then", 120],
  ["call 1h re 1h30 plan", "call re plan", 90],
  ["focus 1.5h 1.5h", "focus", 90],
  ["focus 2h 1.5h", "focus", 120],
  ["focus 1h 2.5h", "focus", 60],
  ["x1.5h", "x", 90],
  ["ship v1.5h fix", "ship v fix", 90],
  ["lunch 1h 60m", "lunch", 120],
  ["lunch 1h 90m", "lunch", 150],
  ["deep work 1h30.", "deep work", 90],
])("strips every duration token for %s", (input, name, durationMinutes) => {
  const parsed = parseCapture(input, ref);
  expect(parsed).toMatchObject({ kind: "flexible", name, durationMinutes });
  expect(parsed).not.toHaveProperty("start");
  expect(parsed).not.toHaveProperty("end");
  expect(parsed.dateExplicit).toBe(false);
  expect(parsed.hasRecurrence).toBe(false);
});

it("keeps an explicit time range when a duplicate duration accompanies it", () => {
  expect(parseCapture("deep work tomorrow 9am-11am 2h", ref)).toMatchObject({
    kind: "exact",
    name: "deep work",
    date: "2026-09-22",
    start: "09:00",
    end: "11:00",
    durationMinutes: 120,
  });
});

// A duration token immediately followed by a 24h clock ("1.5h 12:30") must not
// let `parseDuration` swallow the clock's hour digits. The capture should route
// to an exact block at that time with the intended duration and a clean name.
it.each([
  ["lunch 1h 12:30", "lunch", "12:30", "13:30", 60, "2026-09-21"],
  ["lunch 1.5h 12:30", "lunch", "12:30", "14:00", 90, "2026-09-21"],
  ["deep work 2h 14:00", "deep work", "14:00", "16:00", 120, "2026-09-21"],
  ["lunch 1h 9:30", "lunch", "09:30", "10:30", 60, "2026-09-22"],
])(
  "schedules an exact block for %s instead of corrupting the title",
  (input, name, start, end, durationMinutes, date) => {
    expect(parseCapture(input, ref)).toMatchObject({
      kind: "exact",
      name,
      start,
      end,
      durationMinutes,
      date,
      hasRecurrence: false,
    });
  },
);

// Single-digit minutes stay part of the duration ("1h 5m" is 65 min, not 60).
it("keeps single-digit minutes in a flexible capture", () => {
  expect(parseCapture("lunch 1h 5m", ref)).toMatchObject({ kind: "flexible", name: "lunch", durationMinutes: 65 });
});

// Chrono reads a window word as a date with an implied hour. The window must
// still bound the flexible block, and the implied hour must not move the day.
it.each([
  ["deep work 2h tomorrow morning", "deep work", "2026-09-22", "06:00", "12:00", "morning"],
  ["gym 45m evening", "gym", "2026-09-21", "17:00", "21:00", "evening"],
  ["gym 45m tomorrow evening", "gym", "2026-09-22", "17:00", "21:00", "evening"],
  ["gym 45m in the evening", "gym", "2026-09-21", "17:00", "21:00", "evening"],
  ["read 1h tonight", "read", "2026-09-21", "19:00", "23:00", "tonight"],
  ["read 1h this afternoon", "read", "2026-09-21", "12:00", "17:00", "afternoon"],
  ["focus 2h mornings", "focus", "2026-09-21", "06:00", "12:00", "morning"],
])("keeps the time-of-day window for %s", (input, name, date, earliest, latest, label) => {
  const parsed = parseCapture(input, ref);
  expect(parsed).toMatchObject({ kind: "flexible", name, date, earliest, latest });
  expect(parsed.preview).toContain(` · ${label}`);
});

it("keeps today for a morning window that is still open", () => {
  expect(parseCapture("run 30m morning", new Date(2026, 8, 29, 9))).toMatchObject({
    kind: "flexible",
    name: "run",
    date: "2026-09-29",
    earliest: "06:00",
    latest: "12:00",
  });
});

// The preview labels the day against `ref`, not against the device clock.
it.each([
  ["lunch 3pm", "lunch · Today · 15:00–15:30"],
  ["deep work tomorrow 9am-11am", "deep work · Tomorrow · 09:00–11:00"],
  ["focus 2h", "focus · 2h · Today"],
  ["lunch tomorrow", "lunch · Tomorrow"],
  ["lunch", "lunch"],
])("labels the preview day against ref for %s", (input, preview) => {
  expect(parseCapture(input, ref).preview).toBe(preview);
});

it.each([
  ["standup every weekday 9am", true],
  ["call mom every monday 5pm", true],
  ["water plants daily", true],
  ["lunch 3pm", false],
])("flags recurrence for %s", (input, hasRecurrence) => {
  expect(parseCapture(input, ref).hasRecurrence).toBe(hasRecurrence);
});

it.each([
  ["lunch tomorrow", { kind: "unschedulable", name: "lunch", date: "2026-09-22", dateExplicit: true }],
  ["lunch", { kind: "unschedulable", name: "lunch", date: undefined, dateExplicit: false }],
  ["work friday 2pm", { kind: "exact", name: "work", date: "2026-09-25", start: "14:00", dateExplicit: true }],
  ["work 2pm", { kind: "exact", name: "work", date: "2026-09-21", start: "14:00", dateExplicit: false }],
])("records whether the text named a day for %s", (input, expected) => {
  expect(parseCapture(input, ref)).toMatchObject(expected);
});

it("keeps an exact hour that a window word qualifies", () => {
  expect(parseCapture("call 9 in the morning", ref)).toMatchObject({ kind: "exact", name: "call", start: "09:00" });
});

// A bare "in" or "this" before a window word can be part of the name.
it.each([
  ["check in tonight 30m", "check in", "19:00"],
  ["log in evening 10m", "log in", "17:00"],
  ["weekly check-in this evening 30m", "weekly check-in", "17:00"],
  ["gym 45m in the evening", "gym", "17:00"],
])("keeps the name for %s", (input, name, earliest) => {
  expect(parseCapture(input, new Date(2026, 8, 29, 9, 0))).toMatchObject({ kind: "flexible", name, earliest });
});

it("moves a window that already ended today to tomorrow", () => {
  expect(parseCapture("run 30m morning", new Date(2026, 8, 29, 9, 0))).toMatchObject({ date: "2026-09-29" });
  expect(parseCapture("run 30m morning", new Date(2026, 8, 29, 15, 30))).toMatchObject({
    date: "2026-09-30",
    earliest: "06:00",
  });
});
