import assert from "node:assert/strict";
import { test } from "node:test";
import { entryHours, watchDisplayChanges } from "../src/services/keito/timing.ts";

const startedAt = "2026-11-17T13:55:58.973Z";
const started = Date.parse(startedAt);
const entry = { hours: 0.21, durationSeconds: 747, isRunning: true, timerStartedAt: startedAt };

test("the display clock skips unchanged renders, publishes minute changes, and cleans up", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  let renders = 0;
  const stop = watchDisplayChanges(
    () => String(Math.round(Date.now() / 60_000)),
    () => renders++,
  );
  t.mock.timers.tick(29_000);
  assert.equal(renders, 0);
  t.mock.timers.tick(1000);
  assert.equal(renders, 1);
  t.mock.timers.tick(59_000);
  assert.equal(renders, 1);
  t.mock.timers.tick(1000);
  assert.equal(renders, 2);
  stop();
  t.mock.timers.tick(120_000);
  assert.equal(renders, 2);
});

test("the display clock tracks decimal-hour changes and updated snapshots", (t) => {
  t.mock.timers.enable({ apis: ["setInterval", "Date"], now: 0 });
  let savedHours = 0;
  let renders = 0;
  const stop = watchDisplayChanges(
    () => (savedHours + Date.now() / 3_600_000).toFixed(2),
    () => renders++,
  );
  t.mock.timers.tick(17_000);
  assert.equal(renders, 0);
  t.mock.timers.tick(1000);
  assert.equal(renders, 1);
  savedHours = 1;
  t.mock.timers.tick(1000);
  assert.equal(renders, 2);
  t.mock.timers.tick(34_000);
  assert.equal(renders, 2);
  t.mock.timers.tick(2000);
  assert.equal(renders, 3);
  stop();
});

test("adds the active segment to saved seconds from the live API response", () => {
  assert.equal(entryHours(entry, started + 153_000), 900 / 3600);
  assert.equal(entryHours(entry, started + 213_000), 960 / 3600);
  assert.equal(entry.durationSeconds, 747);
});

test("preserves accumulated time across stop and restart cycles", () => {
  const stopped = { ...entry, isRunning: false, durationSeconds: 900 };
  assert.equal(entryHours(stopped, started + 300_000), 900 / 3600);
  const restarted = { ...stopped, isRunning: true, timerStartedAt: new Date(started + 300_000).toISOString() };
  assert.equal(entryHours(restarted, started + 360_000), 960 / 3600);
  const stoppedAgain = { ...restarted, isRunning: false, durationSeconds: 960 };
  assert.equal(entryHours(stoppedAgain, started + 600_000), 960 / 3600);
});

test("replays both verified Keito restart responses without counting earlier segments twice", () => {
  const cycles = [
    { durationSeconds: 1152, timerStartedAt: "2026-11-17T14:02:44.513Z", now: 1794924168655, expected: 1156 },
    { durationSeconds: 1156, timerStartedAt: "2026-11-17T14:02:49.252Z", now: 1794924173203, expected: 1159 },
    { durationSeconds: 1160, timerStartedAt: "2026-11-17T14:02:53.815Z", now: 1794924174182, expected: 1160 },
  ];
  for (const { now, expected, ...snapshot } of cycles) {
    assert.equal(entryHours({ hours: 0.32, isRunning: true, ...snapshot }, now) * 3600, expected);
  }
});

test("does not double count the current segment when summing the day's entries", () => {
  const entries = [entry, { ...entry, isRunning: false, durationSeconds: 3600 }];
  assert.equal(
    entries.reduce((sum, e) => sum + entryHours(e, started + 153_000), 0),
    1.25,
  );
});

test("falls back to legacy hours when seconds are absent", () => {
  assert.equal(entryHours({ hours: 0.25, isRunning: true, timerStartedAt: startedAt }, started + 900_000), 0.5);
});

test("zero saved seconds take precedence over decimal hours", () => {
  assert.equal(entryHours({ ...entry, durationSeconds: 0 }, started + 60_000), 1 / 60);
});

test("missing, invalid, or future starts never add negative or invalid time", () => {
  for (const timerStartedAt of [undefined, "invalid", new Date(started + 1000).toISOString()]) {
    assert.equal(entryHours({ ...entry, timerStartedAt }, started), 747 / 3600);
  }
});
