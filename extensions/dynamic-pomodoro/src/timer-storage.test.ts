import assert from "node:assert/strict";
import test from "node:test";
import { parseStoredTimerState } from "./timer-storage.ts";

test("parseStoredTimerState keeps backward compatibility with missing preset fields", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 12 * 60_000,
      endsAt: null,
      minutes: 12,
    }),
  );

  assert.equal(parsed.minutes, 12);
  assert.equal(parsed.remainingMs, 12 * 60_000);
  assert.equal(parsed.selectedPreset, undefined);
  assert.equal(parsed.presets, undefined);
});

test("parseStoredTimerState parses optional preset fields", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 25 * 60_000,
      endsAt: null,
      minutes: 25,
      selectedPreset: 50,
      presets: [15, 25, 50],
    }),
  );

  assert.equal(parsed.selectedPreset, 50);
  assert.deepEqual(parsed.presets, [15, 25, 50]);
});

test("parseStoredTimerState preserves lastCompletedAt when value is finite", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 0,
      endsAt: null,
      minutes: 25,
      lastCompletedAt: 123456,
    }),
  );

  assert.equal(parsed.lastCompletedAt, 123456);
});

test("parseStoredTimerState parses optional stats log", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 25 * 60_000,
      endsAt: null,
      minutes: 25,
      stats: {
        starts: [1000, 2000],
        completions: [{ at: 3000, durationMs: 25 * 60_000 }],
      },
    }),
  );

  assert.deepEqual(parsed.stats, {
    starts: [1000, 2000],
    completions: [{ at: 3000, durationMs: 25 * 60_000 }],
    pauses: [],
    resets: [],
    minuteAdjustments: [],
    manualStatsClears: [],
  });
});

test("parseStoredTimerState ignores invalid stats payload safely", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 10 * 60_000,
      endsAt: null,
      minutes: 10,
      stats: {
        starts: ["bad", 1000],
        completions: [{ at: "bad", durationMs: 123 }, { at: 5000, durationMs: "bad" }],
      },
    }),
  );

  assert.deepEqual(parsed.stats, {
    starts: [1000],
    completions: [],
    pauses: [],
    resets: [],
    minuteAdjustments: [],
    manualStatsClears: [],
  });
});

test("parseStoredTimerState normalizes preset list by bounds and uniqueness", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 25 * 60_000,
      endsAt: null,
      minutes: 25,
      presets: [15, "bad", 15, 100, 0, 25],
    }),
  );

  assert.deepEqual(parsed.presets, [15, 60, 1, 25]);
});

test("parseStoredTimerState omits presets when no valid values remain", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 25 * 60_000,
      endsAt: null,
      minutes: 25,
      presets: ["bad", null, {}],
    }),
  );

  assert.equal(parsed.presets, undefined);
});

test("parseStoredTimerState parses pomodoro style and choice flag", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 25 * 60_000,
      endsAt: null,
      minutes: 25,
      pomodoroStyle: "flow",
      styleChoiceSeen: true,
    }),
  );

  assert.equal(parsed.pomodoroStyle, "flow");
  assert.equal(parsed.styleChoiceSeen, true);
});

test("parseStoredTimerState ignores invalid pomodoro style and choice flag", () => {
  const parsed = parseStoredTimerState(
    JSON.stringify({
      isRunning: false,
      remainingMs: 25 * 60_000,
      endsAt: null,
      minutes: 25,
      pomodoroStyle: "unknown",
      styleChoiceSeen: "yes",
    }),
  );

  assert.equal(parsed.pomodoroStyle, undefined);
  assert.equal(parsed.styleChoiceSeen, undefined);
});
