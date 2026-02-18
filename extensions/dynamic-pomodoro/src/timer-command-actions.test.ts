import assert from "node:assert/strict";
import test from "node:test";
import { INITIAL_STATE, type TimerState } from "./timer-state.ts";
import { buildStartActionResult, buildStopActionResult } from "./timer-command-actions.ts";

test("buildStartActionResult starts paused timer", () => {
  const now = 1_000_000;
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    remainingMs: 5 * 60_000,
    minutes: 5,
    endsAt: null,
  };

  const result = buildStartActionResult(state, now);

  assert.equal(result.changed, true);
  assert.equal(result.nextState.isRunning, true);
  assert.equal(result.nextState.endsAt, now + 5 * 60_000);
  assert.match(result.hudMessage, /Timer started/);
});

test("buildStartActionResult resets finished timer then starts it", () => {
  const now = 2_000_000;
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    remainingMs: 0,
    minutes: 25,
    endsAt: null,
  };

  const result = buildStartActionResult(state, now);

  assert.equal(result.changed, true);
  assert.equal(result.nextState.isRunning, true);
  assert.equal(result.nextState.remainingMs, 25 * 60_000);
  assert.equal(result.nextState.endsAt, now + 25 * 60_000);
});

test("buildStartActionResult keeps running timer unchanged", () => {
  const now = 3_000_000;
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    remainingMs: 8 * 60_000,
    endsAt: now + 8 * 60_000,
    minutes: 8,
  };

  const result = buildStartActionResult(state, now);

  assert.equal(result.changed, false);
  assert.equal(result.nextState, state);
  assert.equal(result.hudMessage, "Timer is already running");
});

test("buildStopActionResult stops and resets running timer", () => {
  const now = 4_000_000;
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: true,
    remainingMs: 10 * 60_000,
    endsAt: now + 10 * 60_000,
    minutes: 10,
  };

  const result = buildStopActionResult(state);

  assert.equal(result.changed, true);
  assert.equal(result.nextState.isRunning, false);
  assert.equal(result.nextState.endsAt, null);
  assert.equal(result.nextState.remainingMs, 10 * 60_000);
  assert.equal(result.hudMessage, "Timer stopped");
});

test("buildStopActionResult reports already stopped when no reset is needed", () => {
  const state: TimerState = {
    ...INITIAL_STATE,
    isRunning: false,
    remainingMs: 15 * 60_000,
    minutes: 15,
    endsAt: null,
  };

  const result = buildStopActionResult(state);

  assert.equal(result.changed, false);
  assert.equal(result.nextState.remainingMs, 15 * 60_000);
  assert.equal(result.hudMessage, "Timer is already stopped");
});
