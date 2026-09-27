import assert from "node:assert/strict";
import { test } from "node:test";
import {
  eventFromRecord,
  hostOf,
  MAX_SESSION_MINUTES,
  pairSessions,
  parseDurationSeconds,
  parseEventLines,
  parseLogTimestamp,
  PREDICATE,
  resolveDuration,
} from "./log.ts";
import type { FocusEvent } from "./types.ts";

const MINUTE = 60_000;

const startEvent = (at: number, goal: string, plannedSeconds: number | null = null): FocusEvent => ({
  type: "start",
  at,
  goal,
  plannedSeconds,
});

const summaryEvent = (at: number, startedAt: number | null, reportedSeconds: number | null = null): FocusEvent => ({
  type: "summary",
  at,
  startedAt,
  reportedSeconds,
  pauses: 0,
  blocks: 0,
});

test("parseDurationSeconds reads the start event's bare seconds", () => {
  assert.equal(parseDurationSeconds("60"), 60);
  assert.equal(parseDurationSeconds("3600"), 3600);
});

test("parseDurationSeconds reads the summary's prose", () => {
  assert.equal(parseDurationSeconds("1 minute"), 60);
  assert.equal(parseDurationSeconds("17 minutes"), 17 * 60);
  assert.equal(parseDurationSeconds("1 hour 5 minutes"), 65 * 60);
});

test("parseDurationSeconds reads the older compact spelling", () => {
  assert.equal(parseDurationSeconds("15m"), 15 * 60);
  assert.equal(parseDurationSeconds("1h"), 60 * 60);
});

test("parseDurationSeconds treats a blank or missing duration as unknown", () => {
  assert.equal(parseDurationSeconds(""), null);
  assert.equal(parseDurationSeconds(null), null);
  assert.equal(parseDurationSeconds("   "), null);
});

test("parseDurationSeconds rejects a value it cannot account for in full", () => {
  assert.equal(parseDurationSeconds("a while"), null);
  assert.equal(parseDurationSeconds("60 (estimated)"), null);
});

test("parseLogTimestamp reads the unified log's colon-less offset", () => {
  assert.equal(parseLogTimestamp("2026-09-16 10:12:03.441823+0300"), Date.UTC(2026, 8, 16, 7, 12, 3, 441));
});

test("parseLogTimestamp reads the same stamp with a colon in the offset", () => {
  assert.equal(parseLogTimestamp("2026-09-16 10:12:03.441823+03:00"), Date.UTC(2026, 8, 16, 7, 12, 3, 441));
});

test("parseLogTimestamp handles a negative offset and a missing fraction", () => {
  assert.equal(parseLogTimestamp("2026-09-16 10:12:03-0400"), Date.UTC(2026, 8, 16, 14, 12, 3));
});

test("parseLogTimestamp falls back to Date.parse for anything else", () => {
  assert.equal(parseLogTimestamp("2026-09-16T07:12:03.000Z"), Date.UTC(2026, 8, 16, 7, 12, 3));
});

test("parseLogTimestamp returns null rather than an invalid date", () => {
  assert.equal(parseLogTimestamp("not a date"), null);
  assert.equal(parseLogTimestamp(""), null);
});

test("resolveDuration prefers Raycast's reported figure", () => {
  assert.deepEqual(resolveDuration(30 * MINUTE, 25 * 60), { minutes: 25, source: "reported" });
});

test("resolveDuration allows a minute of rounding slack over wall clock", () => {
  assert.deepEqual(resolveDuration(25 * MINUTE, 26 * 60), { minutes: 26, source: "reported" });
});

test("resolveDuration falls back to wall clock when the reported figure is impossible", () => {
  assert.deepEqual(resolveDuration(1 * MINUTE, 60 * 60), { minutes: 1, source: "timestamps" });
});

test("resolveDuration falls back to wall clock when Raycast logged no duration", () => {
  assert.deepEqual(resolveDuration(25 * MINUTE, null), { minutes: 25, source: "timestamps" });
});

test("resolveDuration has nothing to go on when both are missing", () => {
  assert.equal(resolveDuration(0, null), null);
  assert.equal(resolveDuration(Number.NaN, null), null);
});

test("resolveDuration rejects a sub-minute session", () => {
  assert.equal(resolveDuration(30_000, null), null);
  assert.equal(resolveDuration(90_000, 30), null);
});

test("resolveDuration rejects anything past the ceiling", () => {
  const overCeiling = (MAX_SESSION_MINUTES + 1) * MINUTE;
  assert.equal(resolveDuration(overCeiling, null), null);
  assert.equal(resolveDuration(overCeiling, (MAX_SESSION_MINUTES + 1) * 60), null);
});

test("eventFromRecord reads a start event", () => {
  const event = eventFromRecord({
    timestamp: "2026-09-16 10:12:03.441823+0300",
    eventMessage: "Start focus session\n  Goal: Deep work\n  Duration: 60",
  });
  assert.deepEqual(event, {
    type: "start",
    at: Date.UTC(2026, 8, 16, 7, 12, 3, 441),
    goal: "Deep work",
    plannedSeconds: 60,
  });
});

test("eventFromRecord reads the summary under both headline spellings", () => {
  const body =
    "\n  Start date: 2026-09-16 10:01:31 +0000\n  Source: command\n  Duration: 17 minutes\n  Pauses Count: 0";
  const ndjson = eventFromRecord({
    timestamp: "2026-09-16 10:18:31+0000",
    eventMessage: `Focus session activity summary${body}`,
  });
  const compact = eventFromRecord({
    timestamp: "2026-09-16 10:18:31+0000",
    eventMessage: `Focus session activitysummary${body}`,
  });

  assert.deepEqual(ndjson, {
    type: "summary",
    at: Date.UTC(2026, 8, 16, 10, 18, 31),
    startedAt: Date.UTC(2026, 8, 16, 10, 1, 31),
    reportedSeconds: 17 * 60,
    pauses: 0,
    blocks: 0,
  });
  assert.deepEqual(compact, ndjson);
});

test("eventFromRecord tolerates a summary with a blank duration", () => {
  const event = eventFromRecord({
    timestamp: "2026-09-16 10:18:31+0000",
    eventMessage: "Focus session activity summary\n  Start date: 2026-09-16 10:01:31 +0000\n  Duration: \n",
  });
  assert.equal(event?.type === "summary" && event.reportedSeconds, null);
});

test("eventFromRecord ignores records it cannot place", () => {
  assert.equal(eventFromRecord({ timestamp: "2026-09-16 10:12:03+0000", eventMessage: "Something else" }), null);
  assert.equal(eventFromRecord({ eventMessage: "Start focus session" }), null);
});

test("parseEventLines skips whatever is not a JSON line", () => {
  const text = [
    "Filtering the log data using ...",
    JSON.stringify({
      timestamp: "2026-09-16 10:12:03+0000",
      eventMessage: "Start focus session\n  Goal: Ship\n  Duration: 60",
    }),
    JSON.stringify({ timestamp: "2026-09-16 10:12:04+0000", eventMessage: "Unrelated Raycast focus chatter" }),
    "{ this line is not json",
    JSON.stringify({
      timestamp: "2026-09-16 10:29:03+0000",
      eventMessage: "Focus session activity summary\n  Start date: 2026-09-16 10:12:03 +0000\n  Duration: 17 minutes",
    }),
    "",
  ].join("\n");

  const scan = parseEventLines(text);
  assert.deepEqual(
    scan.events.map((e) => e.type),
    ["start", "summary"],
    "the trailer and the torn line are skipped; unrelated Focus chatter yields no event",
  );
});

test("parseEventLines reports nothing at all for empty output", () => {
  assert.deepEqual(parseEventLines(""), { events: [], records: 0 });
});

test("parseEventLines counts session reports, not every Focus message it is handed", () => {
  const lines = [
    JSON.stringify({
      eventMessage: "Start focus session\n  Goal: Ship\n  Duration: 60",
      timestamp: "2026-09-16 10:00:00.000000+0000",
    }),
    JSON.stringify({ eventMessage: "Focus session paused", timestamp: "2026-09-16 10:05:00.000000+0000" }),
    JSON.stringify({ eventMessage: "Something a later Raycast logs", timestamp: "2026-09-16 10:06:00.000000+0000" }),
  ].join("\n");

  const scan = parseEventLines(lines);
  assert.equal(scan.records, 1);
  assert.equal(scan.events.length, 1);
});

test("a quiet log of Focus chatter is not a blind parser", () => {
  const chatter = [
    JSON.stringify({
      eventMessage: "Browser is now active\n\tBrowser: Arc\n\tFocus Mode: Restore",
      timestamp: "2026-09-16 10:00:00.000000+0000",
    }),
    JSON.stringify({ eventMessage: "Stop focus session", timestamp: "2026-09-16 10:05:00.000000+0000" }),
    JSON.stringify({
      eventMessage: "Focus redirection service has expired",
      timestamp: "2026-09-16 10:06:00.000000+0000",
    }),
  ].join("\n");

  const scan = parseEventLines(chatter);
  assert.deepEqual(scan.events, []);
  assert.equal(scan.records, 0, "nothing here was a session report, so nothing went unread");
});

test("a log full of messages this parser does not understand is not an empty log", () => {
  const renamed = [
    JSON.stringify({
      eventMessage: "Began focus block\n  Objective: Ship",
      timestamp: "2026-09-16 10:00:00.000000+0000",
    }),
    JSON.stringify({
      eventMessage: "Focus block report\n  Began: 2026-09-16 10:00:00 +0000",
      timestamp: "2026-09-16 10:25:00.000000+0000",
    }),
  ].join("\n");

  const scan = parseEventLines(renamed);
  assert.deepEqual(scan.events, [], "the spellings moved, so nothing pairs");
  assert.equal(scan.records, 2, "and the count is the only thing left that says why");
});

test("pairSessions pairs a start with its summary", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const { sessions, pending } = pairSessions([
    startEvent(start, "Deep work"),
    summaryEvent(start + 25 * MINUTE, start, 25 * 60),
  ]);

  assert.deepEqual(sessions, [{ start, goal: "Deep work", duration: 25, source: "reported" }]);
  assert.deepEqual(pending, []);
});

test("pairSessions matches a start whose stamp is up to two seconds off the summary's", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const { sessions } = pairSessions([
    startEvent(start, "Deep work"),
    summaryEvent(start + 25 * MINUTE, start + 2000, 25 * 60),
  ]);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].goal, "Deep work", "the goal only survives if the slack match found the start");
});

test("pairSessions still records a summary whose start rolled off the archive", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const { sessions } = pairSessions([summaryEvent(start + 17 * MINUTE, start, 17 * 60)]);

  assert.deepEqual(sessions, [{ start, goal: "", duration: 17, source: "reported" }]);
});

test("pairSessions drops a summary that names no start and has no start to fall back on", () => {
  assert.deepEqual(pairSessions([summaryEvent(Date.UTC(2026, 8, 16, 10, 17, 0), null, 17 * 60)]).sessions, []);
});

test("pairSessions resolves a start carried forward from an earlier run", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const { sessions, pending } = pairSessions(
    [summaryEvent(start + 30 * MINUTE, start, null)],
    [{ at: start, goal: "Writing" }],
  );

  assert.deepEqual(sessions, [{ start, goal: "Writing", duration: 30, source: "timestamps" }]);
  assert.deepEqual(pending, []);
});

test("pairSessions carries an unmatched start forward", () => {
  const start = Date.now() - 10 * MINUTE;
  const { sessions, pending } = pairSessions([startEvent(start, "Running now")]);

  assert.deepEqual(sessions, []);
  assert.deepEqual(pending, [{ at: start, goal: "Running now" }]);
});

test("a summary that names an unmatchable start does not steal a running session's start", () => {
  const now = Date.now();
  const a = now - 95 * MINUTE;
  const b = now - 5 * MINUTE;

  const { sessions, pending } = pairSessions([startEvent(b, "New thing"), summaryEvent(now, a, 90 * 60)]);

  assert.deepEqual(sessions, [{ start: a, goal: "", duration: 90, source: "reported" }]);
  assert.deepEqual(pending, [{ at: b, goal: "New thing" }], "B is still running and keeps its own start and goal");
});

test("a summary that names an unmatchable start leaves a carried-forward start alone", () => {
  const now = Date.now();
  const carried = now - 30 * MINUTE;
  const orphan = now - 70 * MINUTE;

  const { sessions, pending } = pairSessions(
    [summaryEvent(now - 10 * MINUTE, orphan, 60 * 60)],
    [{ at: carried, goal: "Deep work" }],
  );

  assert.deepEqual(sessions, [{ start: orphan, goal: "", duration: 60, source: "reported" }]);
  assert.deepEqual(pending, [{ at: carried, goal: "Deep work" }], "its own summary has not arrived yet");
});

test("hostOf reduces a blocked URL to the name a tally can add up", () => {
  assert.equal(hostOf("https://www.youtube.com/watch?v=1"), "youtube.com");
  assert.equal(hostOf("http://news.ycombinator.com/"), "news.ycombinator.com");
  assert.equal(hostOf("slack.com"), "slack.com");
});

test("eventFromRecord tells a completed session apart from a cancelled one", () => {
  const at = "2026-09-16 10:18:31+0000";
  assert.deepEqual(eventFromRecord({ timestamp: at, eventMessage: "Complete focus session" }), {
    type: "end",
    at: Date.UTC(2026, 8, 16, 10, 18, 31),
    completed: true,
  });
  assert.deepEqual(eventFromRecord({ timestamp: at, eventMessage: "Cancel focus session" }), {
    type: "end",
    at: Date.UTC(2026, 8, 16, 10, 18, 31),
    completed: false,
  });
});

test("eventFromRecord leaves the editing chatter alone", () => {
  const at = "2026-09-16 10:18:31+0000";
  assert.equal(eventFromRecord({ timestamp: at, eventMessage: "Cancel editing focus session" }), null);
  assert.equal(eventFromRecord({ timestamp: at, eventMessage: "Stop focus session" }), null);
});

test("eventFromRecord reads a pause, a block and a mid-session update", () => {
  const at = "2026-09-16 10:18:31+0000";
  const instant = Date.UTC(2026, 8, 16, 10, 18, 31);

  assert.deepEqual(eventFromRecord({ timestamp: at, eventMessage: "Pause focus session\n\tDuration: 2 minutes" }), {
    type: "pause",
    at: instant,
    seconds: 120,
  });
  assert.deepEqual(
    eventFromRecord({
      timestamp: at,
      eventMessage: "Website has been blocked\n\tWebsite: https://www.youtube.com/\n\tBlocked Count: 1",
    }),
    { type: "blocked", at: instant, site: "youtube.com" },
  );
  assert.deepEqual(
    eventFromRecord({ timestamp: at, eventMessage: "Updating focus session\n\tGoal: 🏄 Break\n\tDuration: 600" }),
    { type: "update", at: instant, goal: "🏄 Break", plannedSeconds: 600 },
  );
});

test("eventFromRecord counts the summary's pauses and blocks", () => {
  const event = eventFromRecord({
    timestamp: "2026-09-16 10:18:31+0000",
    eventMessage:
      "Focus session activity summary\n\tStart date: 2026-09-16 10:01:31 +0000\n\tSource: deeplink\n" +
      "\tDuration: 17 minutes\n\tPauses Count: 2\n\tBlock Events Count: 5\n\tSnooze Events Count: 1",
  });

  assert.equal(event?.type === "summary" && event.pauses, 2);
  assert.equal(event?.type === "summary" && event.blocks, 5);
});

test("pairSessions keeps what the session was set for and what it blocked", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const summary = { ...summaryEvent(start + 50 * MINUTE, start, 50 * 60), blocks: 3 };
  const { sessions } = pairSessions([startEvent(start, "Deep work", 3000), summary]);

  assert.equal(sessions[0].planned, 50);
  assert.equal(sessions[0].blocks, 3);
});

test("pairSessions records nothing for a session that was cancelled", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const { sessions, pending } = pairSessions([
    startEvent(start, "Deep work", 3000),
    { type: "end", at: start + 20 * MINUTE, completed: false },
  ]);

  assert.deepEqual(sessions, [], "twenty minutes you walked out on are not a session");
  assert.deepEqual(pending, [], "a cancelled start is closed, not carried round forever");
});

test("a cancelled session cannot be revived by a summary arriving after it", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const end = start + 20 * MINUTE;
  const { sessions } = pairSessions([
    startEvent(start, "Deep work", 3000),
    { type: "end", at: end, completed: false },
    summaryEvent(end + 200, start, 20 * 60),
  ]);

  assert.deepEqual(sessions, []);
});

test("a completed session is closed by its summary, not by the Complete line before it", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const end = start + 25 * MINUTE;
  const { sessions } = pairSessions([
    startEvent(start, "Deep work"),
    { type: "end", at: end, completed: true },
    summaryEvent(end + 200, start, 25 * 60),
  ]);

  assert.equal(sessions.length, 1, "the pair is counted once");
  assert.equal(sessions[0].goal, "Deep work");
  assert.equal(sessions[0].duration, 25);
});

test("pairSessions leaves paused time out of a wall-clock duration", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const { sessions } = pairSessions([
    startEvent(start, "Deep work"),
    { type: "pause", at: start + 10 * MINUTE, seconds: 300 },
    summaryEvent(start + 30 * MINUTE, start, null),
  ]);

  assert.deepEqual(sessions[0], {
    start,
    goal: "Deep work",
    duration: 25,
    source: "timestamps",
  });
});

test("pairSessions credits blocked sites to the session that was running", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const { sessions } = pairSessions([
    startEvent(start, "Deep work"),
    { type: "blocked", at: start + 5 * MINUTE, site: "youtube.com" },
    { type: "blocked", at: start + 9 * MINUTE, site: "youtube.com" },
    { type: "blocked", at: start + 40 * MINUTE, site: "slack.com" },
    summaryEvent(start + 30 * MINUTE, start, 30 * 60),
  ]);

  assert.deepEqual(sessions[0].sites, { "youtube.com": 2 }, "the one after the session ended is not counted");
  assert.equal(sessions[0].blocks, 2);
});

test("pairSessions follows a goal renamed while the session was running", () => {
  const start = Date.UTC(2026, 8, 16, 10, 0, 0);
  const { sessions } = pairSessions([
    startEvent(start, "Deep work", 600),
    { type: "update", at: start + 5 * MINUTE, goal: "🏄 Break", plannedSeconds: 1800 },
    summaryEvent(start + 30 * MINUTE, start, 30 * 60),
  ]);

  assert.equal(sessions[0].goal, "🏄 Break");
  assert.equal(sessions[0].planned, 30);
});

const V2_START =
  "Starting Focus session\n\tBlocked Apps: \n\tDuration: 60\n\tTitle: 🎓 Probe Goal\n\tMode: block\n\tBlocked Websites:";
const V2_SUMMARY =
  '[handler::focus] Focus session activity summary tracked {\n  source: "deeplink",\n  duration: 60.02,\n  pauseEventCount: 0,\n  blockEventCount: 2,\n  snoozeEventCount: 0\n}';
const V2_TEARDOWN_DONE = "Tearing down Focus session\n\tReason: completed";
const V2_TEARDOWN_CANCELLED = "Tearing down Focus session\n\tReason: cancelled";
const V2_NODE_STARTED =
  '[handler::focus] Focus session started {\n  id: "acc27fd7-3c5c-4f4c-aca0-f0c92663163e",\n  mode: "duration",\n  presentation: "panel"\n}';

const at = "2026-09-21 11:15:19.909000+0300";

test("Raycast 2 start carries the goal under Title, not Goal", () => {
  const event = eventFromRecord({ eventMessage: V2_START, timestamp: at });
  assert.deepEqual(event, {
    type: "start",
    at: parseLogTimestamp(at),
    goal: "🎓 Probe Goal",
    plannedSeconds: 60,
  });
});

test("Raycast 2 summary reads its lowercase, comma-terminated fields", () => {
  const event = eventFromRecord({ eventMessage: V2_SUMMARY, timestamp: at });
  assert.equal(event?.type, "summary");
  assert.deepEqual(event, {
    type: "summary",
    at: parseLogTimestamp(at),
    startedAt: null,
    reportedSeconds: 60.02,
    pauses: 0,
    blocks: 2,
  });
});

test("Raycast 2 reports the end reason in a field rather than the headline", () => {
  assert.deepEqual(eventFromRecord({ eventMessage: V2_TEARDOWN_DONE, timestamp: at }), {
    type: "end",
    at: parseLogTimestamp(at),
    completed: true,
  });
  assert.deepEqual(eventFromRecord({ eventMessage: V2_TEARDOWN_CANCELLED, timestamp: at }), {
    type: "end",
    at: parseLogTimestamp(at),
    completed: false,
  });
});

test("Raycast 2's node-side start is ignored, so it cannot open a goalless session", () => {
  assert.equal(eventFromRecord({ eventMessage: V2_NODE_STARTED, timestamp: at }), null);
});

test("a whole Raycast 2 session pairs into one recorded session", () => {
  const started = parseLogTimestamp("2026-09-21 11:15:19.909000+0300");
  const events = [
    eventFromRecord({ eventMessage: V2_START, timestamp: "2026-09-21 11:15:19.909000+0300" }),
    eventFromRecord({ eventMessage: V2_TEARDOWN_DONE, timestamp: "2026-09-21 11:16:19.910000+0300" }),
    eventFromRecord({ eventMessage: V2_SUMMARY, timestamp: "2026-09-21 11:16:19.984000+0300" }),
  ].filter((e): e is FocusEvent => e !== null);

  const { sessions } = pairSessions(events);
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].goal, "🎓 Probe Goal");
  assert.equal(sessions[0].duration, 1);
  assert.equal(sessions[0].source, "reported");
  assert.equal(sessions[0].blocks, 2);
  assert.equal(sessions[0].start, started);
});

test("a cancelled Raycast 2 session leaves no trace", () => {
  const events = [
    eventFromRecord({ eventMessage: V2_START, timestamp: "2026-09-21 11:15:19.909000+0300" }),
    eventFromRecord({ eventMessage: V2_TEARDOWN_CANCELLED, timestamp: "2026-09-21 11:16:30.000000+0300" }),
  ].filter((e): e is FocusEvent => e !== null);

  const { sessions, pending } = pairSessions(events);
  assert.deepEqual(sessions, []);
  assert.deepEqual(pending, []);
});

test("the predicate still matches Raycast 1's category and Raycast 2's message", () => {
  assert.match(PREDICATE, /category == "focus"/);
  assert.match(PREDICATE, /eventMessage CONTAINS\[c\] "focus session"/);
});

test("a Raycast 2 minute that reports as 59.998 seconds is still a minute", () => {
  assert.deepEqual(resolveDuration(60_084, 59.998), { minutes: 1, source: "reported" });
  assert.deepEqual(resolveDuration(60_084, 60.077), { minutes: 1, source: "reported" });
});

test("rounding to whole seconds does not rescue a genuinely sub-minute session", () => {
  assert.equal(resolveDuration(90_000, 30), null);
  assert.equal(resolveDuration(40_000, 29.4), null);
});

test("Raycast 2's start entry carries the blocklist it spells out", () => {
  const message =
    "Starting Focus session\n\tBlocked Apps: com.apple.FaceTime\n\tDuration: 60\n\tTitle: 🎓 Course\n\tMode: block\n\tBlocked Websites: booking.com, airbnb.com, google.com";
  const event = eventFromRecord({ eventMessage: message, timestamp: "2026-09-21 11:27:35.000000+0300" });
  assert.equal(event?.type, "start");
  assert.deepEqual(event?.type === "start" ? event.blocked : null, {
    mode: "block",
    apps: ["com.apple.FaceTime"],
    websites: ["booking.com", "airbnb.com", "google.com"],
  });
});

test("a Raycast 2 session that blocked nothing carries no blocklist to learn from", () => {
  const message =
    "Starting Focus session\n\tBlocked Apps: \n\tDuration: 60\n\tTitle: Ship\n\tMode: block\n\tBlocked Websites:";
  const event = eventFromRecord({ eventMessage: message, timestamp: "2026-09-21 11:27:35.000000+0300" });
  assert.equal(event?.type === "start" ? event.blocked : "missing", undefined);
});

test("a Raycast 1 start has no blocklist in the log at all", () => {
  const event = eventFromRecord({
    eventMessage: "Start focus session\n  Goal: Deep work\n  Duration: 60",
    timestamp: "2026-09-16 10:12:03.441823+0300",
  });
  assert.equal(event?.type === "start" ? event.blocked : "missing", undefined);
});
