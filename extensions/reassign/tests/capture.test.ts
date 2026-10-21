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

// A spaced bare integer before more words is part of the title, not minutes.
it.each([
  ["review 1h 12 issues", "review 12 issues", 60],
  ["review 2h 3 PRs", "review 3 PRs", 120],
  ["review 1h 12 issues tomorrow", "review 12 issues", 60],
])("keeps a title integer after the duration for %s", (input, name, durationMinutes) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "flexible", name, durationMinutes });
});

// At the end of the text or before a date or time, the integer stays minutes.
it.each([
  ["gym 1h 30", "gym", 90, false],
  ["gym 1h 30.", "gym", 90, false],
  ["gym 1h 30 tomorrow", "gym", 90, true],
  ["gym 1h 30 in the evening", "gym", 90, false],
  ["gym 1h 30m", "gym", 90, false],
  ["focus 1h30.", "focus", 90, false],
  ["sync 1h 5m", "sync", 65, false],
  ["run 1h5", "run", 65, false],
  ["write 1h 30 min", "write", 90, false],
  ["writing tomorrow for 90m", "writing", 90, true],
])("keeps the minutes for %s", (input, name, durationMinutes, dateExplicit) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "flexible", name, durationMinutes, dateExplicit });
});

it("keeps the minutes before a clock time", () => {
  expect(parseCapture("gym 1h 30 at 6pm", ref)).toMatchObject({
    kind: "exact",
    name: "gym",
    start: "18:00",
    durationMinutes: 90,
  });
});

// A spaced bare integer ("1h 30") stays minutes before a time token even when
// chrono-node does not absorb the connector in front of it ("at noon", "until 6pm",
// "before noon", ...). Only the literal connector "in the" was tolerated before, which
// halved the duration to 60 and leaked the integer into the name.
it.each([
  ["gym 1h 30 at noon", "gym", "12:00", "13:30", 90],
  ["gym 1h 30 at midnight", "gym", "00:00", "01:30", 90],
  ["gym 1h 30 until 6pm", "gym until", "18:00", "19:30", 90],
  ["gym 1h 30 before noon", "gym before", "12:00", "13:30", 90],
  ["gym 1h 30 after 6pm", "gym after", "18:00", "19:30", 90],
  ["gym 1h 30 around 6pm", "gym around", "18:00", "19:30", 90],
  ["gym 1h 30 till 6pm", "gym till", "18:00", "19:30", 90],
  ["gym 1h 30 by 6pm", "gym", "18:00", "19:30", 90],
  ["gym 1h 30 at around 6pm", "gym around", "18:00", "19:30", 90],
  ["gym 1h 30 in evening", "gym in", undefined, undefined, 90],
])("keeps the minutes when a connector precedes the time for %s", (input, name, start, end, durationMinutes) => {
  const expected: Record<string, unknown> = { kind: start ? "exact" : "flexible", name, durationMinutes };
  if (start) {
    expected.start = start;
    expected.end = end;
  }
  expect(parseCapture(input, ref)).toMatchObject(expected);
  // The bare integer must never leak into the committed name.
  expect(parseCapture(input, ref).name).not.toMatch(/\b30\b/);
});

// Chrono-node does not absorb "the" in front of a time token. Before the fix,
// only the literal "in the" was tolerated, so "before the 6pm", "at the noon",
// "until the 6pm", ... left a trailing "the " in `lead`, the bare integer was
// treated as title text, and the duration collapsed to the hours-only value.
it.each([
  ["gym 1h 30 before the 6pm meeting", "gym before meeting", "18:00", "19:30", 90],
  ["gym 1h 30 until the 6pm", "gym until", "18:00", "19:30", 90],
  ["gym 1h 30 around the 6pm", "gym around", "18:00", "19:30", 90],
  ["gym 1h 30 till the 6pm", "gym till", "18:00", "19:30", 90],
  ["gym 1h 30 at the 6pm", "gym", "18:00", "19:30", 90],
  ["gym 1h 30 at the noon", "gym", "12:00", "13:30", 90],
  ["gym 1h 30 on the 6pm", "gym", "18:00", "19:30", 90],
  ["gym 1h 30 by the 6pm", "gym", "18:00", "19:30", 90],
  ["gym 1h 30 to the 6pm", "gym", "18:00", "19:30", 90],
  ["gym 1h 30 in the 6pm", "gym in", "18:00", "19:30", 90],
  ["gym 1h 30 in the evening", "gym", undefined, undefined, 90],
  ["gym 1h 30 from the 6pm", "gym", "18:00", "19:30", 90],
  ["gym 1h 30 at around the 6pm", "gym around", "18:00", "19:30", 90],
])(
  "keeps the minutes when a connector plus 'the' precedes the time for %s",
  (input, name, start, end, durationMinutes) => {
    const expected: Record<string, unknown> = { kind: start ? "exact" : "flexible", name, durationMinutes };
    if (start) {
      expected.start = start;
      expected.end = end;
    }
    expect(parseCapture(input, ref)).toMatchObject(expected);
    // The bare integer must never leak into the committed name.
    expect(parseCapture(input, ref).name).not.toMatch(/\b30\b/);
  },
);

// A content word ("issues", a name) between the integer and the time keeps the integer
// in the title, so the duration is the hours-only value and the count stays in the name.
it.each([
  ["review 1h 12 issues at noon", "review 12 issues", "12:00", "13:00", 60],
  ["review 1h 12 issues tomorrow", "review 12 issues", undefined, undefined, 60],
  ["review 1h 12 issues", "review 12 issues", undefined, undefined, 60],
])("still keeps a title integer before content words for %s", (input, name, start, end, durationMinutes) => {
  const expected: Record<string, unknown> = { name, durationMinutes };
  if (start) {
    expected.kind = "exact";
    expected.start = start;
    expected.end = end;
  }
  expect(parseCapture(input, ref)).toMatchObject(expected);
});

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

// Chrono splits "at 6 in the evening" into "at 6" + "evening" (it merges
// "in the morning"/"in the afternoon" but not "in the evening"/"in the
// night"). A bare hour followed by "in the evening"/"in the night" must be
// reconciled into the window (06:00 → 18:00) so the seeded form does not flip
// the user's evening to early morning of the next day, and the window word
// must be stripped from the title instead of leaking in as "gym in evening".
it.each([
  ["gym at 6 in the evening", "gym", "2026-09-21", "18:00", "18:30", 30, false],
  ["gym at 7 in the evening", "gym", "2026-09-21", "19:00", "19:30", 30, false],
  ["gym at 9 in the evening", "gym", "2026-09-21", "21:00", "21:30", 30, false],
  ["gym at 11 in the evening", "gym", "2026-09-21", "23:00", "23:30", 30, false],
  ["gym at 6 in the night", "gym", "2026-09-21", "18:00", "18:30", 30, false],
  ["gym at 11 in the night", "gym", "2026-09-21", "23:00", "23:30", 30, false],
  ["yoga at 7 in the evening", "yoga", "2026-09-21", "19:00", "19:30", 30, false],
])("reconciles a bare hour with a window word for %s", (input, name, date, start, end, durationMinutes, explicit) => {
  const parsed = parseCapture(input, ref);
  expect(parsed).toMatchObject({ kind: "exact", name, date, start, end, durationMinutes, dateExplicit: explicit });
  expect(parsed.name).not.toMatch(/\bevening\b|\bnight\b/i);
  expect(parsed.preview).toBe(`${name} · Today · ${start}–${end}`);
});

// The reconciled "in the evening" phrasing must match the working sibling
// "evening" (no "the") byte-for-byte, so adding "the" no longer flips the result.
it.each([
  ["gym at 6 in the evening", "gym at 6 evening"],
  ["gym at 5 in the evening", "gym at 5 evening"],
  ["gym at 9 in the evening", "gym at 9 evening"],
  ["gym at 11 in the evening", "gym at 11 evening"],
  ["gym at 6 in the night", "gym at 6 night"],
  ["gym at 11-12 in the evening", "gym at 11-12 evening"],
  ["gym at 6-7 in the evening", "gym at 6-7 evening"],
  ["gym at 6 in the evening tomorrow", "gym at 6 evening tomorrow"],
  ["gym at 6 in the evening today", "gym at 6 evening today"],
])('parses %s like its sibling without "the" (%s)', (a, b) => {
  const pa = parseCapture(a, ref);
  const pb = parseCapture(b, ref);
  expect(pa).toEqual(pb);
});

// A window phrase that names a day ("evening tomorrow") keeps that day on the
// reconciled capture. Chrono does not advance "tomorrow" after "evening", so
// the fix re-parses the rest of the phrase to recover the explicit day.
it.each([
  ["gym at 6 in the evening tomorrow", "gym", "2026-09-22", "18:00", "18:30", true],
  ["gym at 11 in the evening tomorrow", "gym", "2026-09-22", "23:00", "23:30", true],
  ["gym at 6 in the evening today", "gym", "2026-09-21", "18:00", "18:30", true],
  ["gym at 6 in the evening on friday", "gym", "2026-09-25", "18:00", "18:30", true],
])("keeps the day named in the window phrase for %s", (input, name, date, start, end, explicit) => {
  expect(parseCapture(input, ref)).toMatchObject({
    kind: "exact",
    name,
    date,
    start,
    end,
    durationMinutes: 30,
    dateExplicit: explicit,
  });
});

// A range whose start and end are both bare ("6-7 in the evening") reconciles
// both bounds into the window. An overnight range ("11-1 in the evening")
// keeps chrono's already-advanced end, so the span stays at two hours.
it.each([
  ["gym at 6-7 in the evening", "gym", "2026-09-21", "18:00", "19:00", 60],
  ["gym at 9-11 in the evening", "gym", "2026-09-21", "21:00", "23:00", 120],
  ["gym at 11-1 in the evening", "gym", "2026-09-21", "23:00", "01:00", 120],
  ["gym at 8-10 in the night", "gym", "2026-09-21", "20:00", "22:00", 120],
  ["gym at 11-1 in the night", "gym", "2026-09-21", "23:00", "01:00", 120],
])("reconciles a range with a window word for %s", (input, name, date, start, end, durationMinutes) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", name, date, start, end, durationMinutes });
});

// A small night hour stays AM ("1 in the night" is 01:00), and "12 in the night" is
// midnight. Each lands on the next day when that time has passed today.
it.each([
  ["call at 1 in the night", "2026-09-22", "01:00", "01:30", 30],
  ["call at 1:30 in the night", "2026-09-22", "01:30", "02:00", 30],
  ["call at 5 in the night", "2026-09-22", "05:00", "05:30", 30],
  ["call at 12 in the night", "2026-09-22", "00:00", "00:30", 30],
  ["call at 12:30 in the night", "2026-09-22", "00:30", "01:00", 30],
  ["call tomorrow at 1 in the night", "2026-09-22", "01:00", "01:30", 30],
  ["call from 1 to 3 in the night", "2026-09-22", "01:00", "03:00", 120],
  ["call from 12 to 2 in the night", "2026-09-22", "00:00", "02:00", 120],
  ["call from 10 to 2 in the night", "2026-09-21", "22:00", "02:00", 240],
])("keeps a small night hour in the small hours for %s", (input, date, start, end, durationMinutes) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", name: "call", date, start, end, durationMinutes });
});

it("keeps a small night hour today when it is still ahead", () => {
  const justAfterMidnight = new Date(2026, 8, 21, 0, 30);
  expect(parseCapture("call at 1 in the night", justAfterMidnight)).toMatchObject({
    date: "2026-09-21",
    start: "01:00",
  });
});

// Conditions chrono already parses correctly (PM hour inside the window, or a
// window phrase it merges itself) are not touched by the reconciliation.
it.each([
  ["gym at 6pm in the evening", "gym", "2026-09-21", "18:00"],
  ["gym at 18 in the evening", "gym", "2026-09-21", "18:00"],
  ["gym at 6 in the afternoon", "gym", "2026-09-21", "18:00"],
  ["gym at 6 in the morning", "gym", "2026-09-22", "06:00"],
  ["call 9 in the morning", "call", "2026-09-22", "09:00"],
])("does not over-shift when chrono already placed the hour for %s", (input, name, date, start) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", name, date, start });
});

// A duration before the time, or after it, must still apply on top of the
// reconciled hour. The window word is stripped from the title in every shape.
it.each([
  ["gym 30m at 6 in the evening", "gym", "2026-09-21", "18:00", "18:30", 30],
  ["deep work 2h at 6 in the evening", "deep work", "2026-09-21", "18:00", "20:00", 120],
  ["gym at 6 in the evening for 1h", "gym", "2026-09-21", "18:00", "19:00", 60],
  ["gym at 6 in the evening 30m", "gym", "2026-09-21", "18:00", "18:30", 30],
])("keeps the duration with a reconciled window hour for %s", (input, name, date, start, end, durationMinutes) => {
  expect(parseCapture(input, ref)).toMatchObject({ kind: "exact", name, date, start, end, durationMinutes });
  expect(parseCapture(input, ref).name).not.toMatch(/\bevening\b/i);
});

// A content word after the window phrase ("and practice") still reaches the
// name; only the adjacent window result is consumed for the reconciliation.
it("keeps a trailing name word after a reconciled window hour", () => {
  expect(parseCapture("gym at 6 in the evening and practice", ref)).toMatchObject({
    kind: "exact",
    name: "gym and practice",
    date: "2026-09-21",
    start: "18:00",
    end: "18:30",
  });
});

// When the reconciled time has already passed today, the date rolls to
// tomorrow — matching the "6 evening" sibling chrono parses itself.
it.each([
  ["gym at 6 in the evening", "2026-09-22", "18:00"],
  ["gym at 9 in the evening", "2026-09-22", "21:00"],
])("rolls a past reconciled time to tomorrow for %s", (input, date, start) => {
  expect(parseCapture(input, new Date(2026, 8, 21, 21, 30))).toMatchObject({
    kind: "exact",
    name: "gym",
    date,
    start,
  });
});

// A reconciled time still ahead today stays today, even when chrono's original
// 6am had rolled to tomorrow via forwardDate.
it("keeps today for a reconciled evening time still ahead", () => {
  expect(parseCapture("gym at 11 in the night", new Date(2026, 8, 21, 20, 0))).toMatchObject({
    kind: "exact",
    name: "gym",
    date: "2026-09-21",
    start: "23:00",
  });
});
