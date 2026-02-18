import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PRESETS, INITIAL_STATE, type TimerState } from "./timer-state.ts";
import { getAvailableActions } from "./timer-actions.ts";

test("getAvailableActions returns paused-state actions", () => {
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    minutes: 25,
    remainingMs: 25 * 60_000,
    selectedPreset: 25,
    presets: [15, 25, 50],
  };

  const actions = getAvailableActions(state, { isReady: true });

  assert.equal(actions.primary, "start");
  assert.equal(actions.canIncrease, true);
  assert.equal(actions.canDecrease, true);
  assert.equal(actions.canApplyPreset, true);
  assert.equal(actions.canQuickStart, true);
  assert.equal(actions.canResetToPreset, false);
  assert.equal(actions.canChangeStyle, true);
  assert.equal(actions.pomodoroStyle, "classic");
  assert.equal(actions.completionPrimaryAction, "continue-preset");
  assert.deepEqual(actions.presets, [...DEFAULT_PRESETS]);
});

test("getAvailableActions returns running-state restrictions", () => {
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    endsAt: 500_000,
    minutes: 25,
    remainingMs: 25 * 60_000,
    selectedPreset: 25,
    presets: [15, 25, 50],
  };

  const actions = getAvailableActions(state, { isReady: true });

  assert.equal(actions.primary, "pause");
  assert.equal(actions.canIncrease, false);
  assert.equal(actions.canDecrease, false);
  assert.equal(actions.canApplyPreset, false);
  assert.equal(actions.canQuickStart, false);
  assert.equal(actions.canResetToPreset, false);
  assert.equal(actions.canChangeStyle, false);
});

test("getAvailableActions falls back to default 25-minute preset when stored selected preset is outside list", () => {
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    minutes: 22,
    remainingMs: 22 * 60_000,
    selectedPreset: 22,
    presets: [15, 25, 50],
  };

  const actions = getAvailableActions(state, { isReady: true });

  assert.deepEqual(actions.presets, [...DEFAULT_PRESETS]);
  assert.equal(actions.selectedPreset, 25);
});

test("getAvailableActions disables all actions when not ready", () => {
  const actions = getAvailableActions(INITIAL_STATE, { isReady: false });

  assert.equal(actions.primary, "start");
  assert.equal(actions.canIncrease, false);
  assert.equal(actions.canDecrease, false);
  assert.equal(actions.canApplyPreset, false);
  assert.equal(actions.canQuickStart, false);
  assert.equal(actions.canResetToPreset, false);
  assert.equal(actions.canChangeStyle, false);
});

test("getAvailableActions sets flow completion action when flow style selected", () => {
  const state: TimerState = {
    ...INITIAL_STATE,
    pomodoroStyle: "flow",
    isRunning: false,
  };

  const actions = getAvailableActions(state, { isReady: true });
  assert.equal(actions.pomodoroStyle, "flow");
  assert.equal(actions.completionPrimaryAction, "extend-5");
});
