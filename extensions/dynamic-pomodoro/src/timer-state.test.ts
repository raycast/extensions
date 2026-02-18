import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPreset,
  clearStats,
  DEFAULT_PRESETS,
  decreaseMinutes,
  decreaseMinutesBy,
  formatDuration,
  getDisplayRemainingMs,
  getRollingProgress,
  getRollingStats24h,
  hydrateTimerAfterLoad,
  getRemainingMs,
  increaseMinutes,
  increaseMinutesBy,
  INITIAL_STATE,
  MAX_MINUTES,
  MIN_MINUTES,
  normalizeIfFinished,
  pauseTimer,
  quickStart,
  resetTimer,
  resetTimerWithEvent,
  shouldNotifyFinishedAfterLoad,
  startTimer,
  type TimerState,
} from "./timer-state.ts";

test("start -> pause updates running flags and remaining time", () => {
  const state: TimerState = {
    ...INITIAL_STATE,
    minutes: 10,
    remainingMs: 5_000,
  };

  const started = startTimer(state, 1_000);
  assert.equal(started.isRunning, true);
  assert.equal(started.endsAt, 6_000);

  const paused = pauseTimer(started, 3_500);
  assert.equal(paused.isRunning, false);
  assert.equal(paused.endsAt, null);
  assert.equal(paused.remainingMs, 2_500);
});

test("normalizeIfFinished marks timer as finished when elapsed", () => {
  const running = startTimer(
    {
      ...INITIAL_STATE,
      remainingMs: 1_500,
    },
    10_000,
  );

  const normalized = normalizeIfFinished(running, 12_000);
  assert.equal(normalized.isRunning, false);
  assert.equal(normalized.endsAt, null);
  assert.equal(normalized.remainingMs, 0);
  assert.equal(normalized.lastCompletedAt, 11_500);
});

test("minutes adjustment respects running state and min/max bounds", () => {
  const runningState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    endsAt: 1_200_000,
    minutes: 20,
    remainingMs: 20 * 60_000,
  };

  assert.deepEqual(increaseMinutes(runningState), runningState);
  assert.deepEqual(decreaseMinutes(runningState), runningState);

  const atMax: TimerState = {
    ...INITIAL_STATE,
    minutes: MAX_MINUTES,
    remainingMs: MAX_MINUTES * 60_000,
  };
  assert.equal(increaseMinutes(atMax).minutes, MAX_MINUTES);

  const atMin: TimerState = {
    ...INITIAL_STATE,
    minutes: MIN_MINUTES,
    remainingMs: MIN_MINUTES * 60_000,
  };
  assert.equal(decreaseMinutes(atMin).minutes, MIN_MINUTES);
});

test("smoke helpers: formatDuration/getRemainingMs/reset", () => {
  assert.equal(formatDuration(90_000), "1:30");
  assert.equal(formatDuration(0), "0:00");

  const running = startTimer({ ...INITIAL_STATE, remainingMs: 3_000 }, 1_000);
  assert.equal(getRemainingMs(running, 2_000), 2_000);

  const reset = resetTimer({ ...INITIAL_STATE, minutes: 15, remainingMs: 4_000 });
  assert.equal(reset.remainingMs, 15 * 60_000);
  assert.equal(reset.isRunning, false);
});

test("clearStats removes starts and completions without changing timer state", () => {
  const withStats: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    minutes: 10,
    remainingMs: 10 * 60_000,
    stats: {
      starts: [1_000, 2_000],
      completions: [{ at: 3_000, durationMs: 10 * 60_000 }],
    },
  };

  const cleared = clearStats(withStats, 4_000);
  assert.equal(cleared.minutes, withStats.minutes);
  assert.equal(cleared.remainingMs, withStats.remainingMs);
  assert.deepEqual(cleared.stats, {
    starts: [],
    completions: [],
    pauses: [],
    resets: [],
    minuteAdjustments: [],
    manualStatsClears: [4_000],
  });
});

test("getDisplayRemainingMs returns selected duration after timer is finished", () => {
  const finishedState: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    minutes: 15,
    remainingMs: 0,
    endsAt: null,
  };

  assert.equal(getDisplayRemainingMs(finishedState, 1_000), 15 * 60_000);
});

test("minute adjustment supports custom steps", () => {
  const base = { ...INITIAL_STATE, minutes: 10, remainingMs: 10 * 60_000 };
  assert.equal(increaseMinutesBy(base, 5).minutes, 15);
  assert.equal(decreaseMinutesBy(base, 5).minutes, 5);
});

test("running state uses endsAt to compute remaining and pause", () => {
  const runningState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    endsAt: 5_000,
    remainingMs: 5_000,
  };

  assert.equal(getRemainingMs(runningState, 2_000), 3_000);

  const paused = pauseTimer(runningState, 2_000);
  assert.equal(paused.isRunning, false);
  assert.equal(paused.endsAt, null);
  assert.equal(paused.remainingMs, 3_000);
});

test("hydrateTimerAfterLoad restores running timer with current baseline", () => {
  const loadedRunningState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    remainingMs: 25 * 60_000,
    endsAt: 10_000 + 25 * 60_000,
  };

  const hydrated = hydrateTimerAfterLoad(loadedRunningState, 70_000);
  assert.equal(hydrated.isRunning, true);
  assert.equal(hydrated.remainingMs, 1_440_000);
  assert.equal(hydrated.endsAt, 1_510_000);
});

test("hydrateTimerAfterLoad does not restart invalid running state without endsAt", () => {
  const invalidRunningState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    remainingMs: 25 * 60_000,
    endsAt: null,
  };

  const hydrated = hydrateTimerAfterLoad(invalidRunningState, 70_000);
  assert.equal(hydrated.isRunning, false);
  assert.equal(hydrated.remainingMs, 25 * 60_000);
  assert.equal(hydrated.endsAt, null);
});

test("hydrateTimerAfterLoad stores completion timestamp when timer already finished while inactive", () => {
  const previousState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    remainingMs: 2_000,
    endsAt: 10_000,
  };

  const hydrated = hydrateTimerAfterLoad(previousState, 12_000);
  assert.equal(hydrated.isRunning, false);
  assert.equal(hydrated.remainingMs, 0);
  assert.equal(hydrated.lastCompletedAt, 10_000);
});

test("shouldNotifyFinishedAfterLoad returns true only when timer finished while inactive", () => {
  const previousState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    remainingMs: 10_000,
    endsAt: 10_000,
  };

  const finishedHydratedState: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    remainingMs: 0,
    endsAt: null,
  };

  assert.equal(shouldNotifyFinishedAfterLoad(previousState, finishedHydratedState), true);

  const stillRunningHydratedState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    remainingMs: 5_000,
    endsAt: 15_000,
  };
  assert.equal(shouldNotifyFinishedAfterLoad(previousState, stillRunningHydratedState), false);
});

test("applyPreset updates minutes and remaining for paused timer", () => {
  const updated = applyPreset(
    {
      ...INITIAL_STATE,
      minutes: 10,
      remainingMs: 10 * 60_000,
      presets: DEFAULT_PRESETS,
      selectedPreset: 10,
    },
    50,
  );

  assert.equal(updated.minutes, 50);
  assert.equal(updated.remainingMs, 50 * 60_000);
  assert.equal(updated.selectedPreset, 50);
});

test("applyPreset does not change running timer", () => {
  const runningState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    endsAt: 2_000_000,
    minutes: 25,
    remainingMs: 25 * 60_000,
    selectedPreset: 25,
    presets: DEFAULT_PRESETS,
  };

  const updated = applyPreset(runningState, 50);
  assert.deepEqual(updated, runningState);
});

test("quickStart applies preset and starts timer", () => {
  const started = quickStart(
    {
      ...INITIAL_STATE,
      isRunning: false,
      endsAt: null,
      remainingMs: 5 * 60_000,
      minutes: 5,
      presets: DEFAULT_PRESETS,
      selectedPreset: 5,
    },
    25,
    1_000,
  );

  assert.equal(started.isRunning, true);
  assert.equal(started.minutes, 25);
  assert.equal(started.remainingMs, 25 * 60_000);
  assert.equal(started.selectedPreset, 25);
  assert.equal(started.endsAt, 1_501_000);
});

test("startTimer records start event only on successful start", () => {
  const now = 10_000;
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    remainingMs: 25 * 60_000,
    minutes: 25,
    endsAt: null,
  };

  const started = startTimer(state, now);
  assert.equal(started.stats?.starts.length, 1);
  assert.equal(started.stats?.starts[0], now);

  const duplicateStart = startTimer(started, now + 1_000);
  assert.equal(duplicateStart.stats?.starts.length, 1);
});

test("normalizeIfFinished records completion duration", () => {
  const running = startTimer(
    {
      ...INITIAL_STATE,
      isRunning: false,
      remainingMs: 25 * 60_000,
      minutes: 25,
    },
    1_000,
  );

  const normalized = normalizeIfFinished(running, 1_510_000);
  assert.equal(normalized.stats?.completions.length, 1);
  assert.equal(normalized.stats?.completions[0].at, 1_501_000);
  assert.equal(normalized.stats?.completions[0].durationMs, 25 * 60_000);
});

test("hydrateTimerAfterLoad records completion when timer ended in background", () => {
  const previousState: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    minutes: 20,
    remainingMs: 5_000,
    endsAt: 100_000,
  };

  const hydrated = hydrateTimerAfterLoad(previousState, 120_000);
  assert.equal(hydrated.isRunning, false);
  assert.equal(hydrated.stats?.completions.length, 1);
  assert.equal(hydrated.stats?.completions[0].at, 100_000);
  assert.equal(hydrated.stats?.completions[0].durationMs, 20 * 60_000);
});

test("getRollingStats24h returns metrics only within rolling window", () => {
  const now = 200_000;
  const dayMs = 24 * 60 * 60 * 1000;
  const state: TimerState = {
    ...INITIAL_STATE,
    stats: {
      starts: [now - dayMs - 1, now - 60_000, now - 30_000],
      completions: [
        { at: now - dayMs - 1, durationMs: 15 * 60_000 },
        { at: now - 45_000, durationMs: 25 * 60_000 },
      ],
    },
  };

  const stats = getRollingStats24h(state, now);
  assert.equal(stats.starts24h, 2);
  assert.equal(stats.completions24h, 1);
  assert.equal(stats.focusTimeMs24h, 25 * 60_000);
  assert.equal(stats.completionRate24h, 0.5);
  assert.equal(stats.lastStartAt, now - 30_000);
  assert.equal(stats.lastCompletionAt, now - 45_000);
});

test("getRollingStats24h hides last events when only stale 24h+ events remain", () => {
  const now = 300_000;
  const dayMs = 24 * 60 * 60 * 1000;
  const state: TimerState = {
    ...INITIAL_STATE,
    stats: {
      starts: [now - dayMs - 60_000],
      completions: [{ at: now - dayMs - 30_000, durationMs: 20 * 60_000 }],
    },
  };

  const stats = getRollingStats24h(state, now);
  assert.equal(stats.starts24h, 0);
  assert.equal(stats.completions24h, 0);
  assert.equal(stats.focusTimeMs24h, 0);
  assert.equal(stats.completionRate24h, 0);
  assert.equal(stats.lastStartAt, undefined);
  assert.equal(stats.lastCompletionAt, undefined);
});

test("getRollingStats24h includes events at 24h boundary and excludes older by 1ms", () => {
  const now = 900_000;
  const dayMs = 24 * 60 * 60 * 1000;
  const boundary = now - dayMs;
  const state: TimerState = {
    ...INITIAL_STATE,
    stats: {
      starts: [boundary - 1, boundary],
      completions: [
        { at: boundary - 1, durationMs: 10 * 60_000 },
        { at: boundary, durationMs: 25 * 60_000 },
      ],
    },
  };

  const stats = getRollingStats24h(state, now);
  assert.equal(stats.starts24h, 1);
  assert.equal(stats.completions24h, 1);
  assert.equal(stats.focusTimeMs24h, 25 * 60_000);
  assert.equal(stats.completionRate24h, 1);
  assert.equal(stats.lastStartAt, boundary);
  assert.equal(stats.lastCompletionAt, boundary);
});

test("getRollingProgress returns 7d summary and trend against previous 7d", () => {
  const now = 14 * 24 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  const state: TimerState = {
    ...INITIAL_STATE,
    stats: {
      starts: [now - dayMs, now - 2 * dayMs, now - 8 * dayMs],
      completions: [
        { at: now - dayMs, durationMs: 20 * 60_000 },
        { at: now - 2 * dayMs, durationMs: 25 * 60_000 },
        { at: now - 8 * dayMs, durationMs: 10 * 60_000 },
      ],
      pauses: [now - dayMs],
      resets: [now - 2 * dayMs],
      minuteAdjustments: [
        { at: now - dayMs, delta: 5, from: 20, to: 25 },
        { at: now - 2 * dayMs, delta: -5, from: 25, to: 20 },
      ],
      manualStatsClears: [],
    },
  };

  const progress = getRollingProgress(state, now);
  assert.equal(progress.starts7d, 2);
  assert.equal(progress.completions7d, 2);
  assert.equal(progress.focusTimeMs7d, 45 * 60_000);
  assert.equal(progress.completionRate7d, 1);
  assert.equal(progress.avgCompletedDurationMs7d, Math.round((45 * 60_000) / 2));
  assert.equal(progress.activeCompletionDays7d, 2);
  assert.equal(progress.interruptRate7d, 1);
  assert.equal(progress.avgAdjustmentsPerSession7d, 1);
  assert.equal(Math.round(progress.focusTrendVsPrev7dPercent ?? 0), 350);
  assert.equal(Math.round(progress.completionTrendVsPrev7dPercent ?? 0), 0);
});

test("pause/reset/minute adjustments are written into stats log", () => {
  const now = 100_000;
  const started = startTimer({ ...INITIAL_STATE, minutes: 10, remainingMs: 10 * 60_000 }, now);
  const paused = pauseTimer(started, now + 5_000);
  assert.equal(paused.stats?.pauses?.length, 1);

  const resetWithEvent = resetTimerWithEvent(paused, now + 6_000);
  assert.equal(resetWithEvent.stats?.resets?.length, 1);

  const increased = increaseMinutesBy(resetWithEvent, 5, now + 7_000);
  assert.equal(increased.stats?.minuteAdjustments?.length, 1);
});

test("resume after pause is counted as a new start", () => {
  const now = 5_000;
  const started = startTimer(
    {
      ...INITIAL_STATE,
      isRunning: false,
      minutes: 25,
      remainingMs: 25 * 60_000,
    },
    now,
  );
  const paused = pauseTimer(started, now + 5_000);
  const resumed = startTimer(paused, now + 6_000);

  assert.equal(resumed.stats?.starts.length, 2);
  assert.equal(resumed.stats?.starts[0], now);
  assert.equal(resumed.stats?.starts[1], now + 6_000);
});
