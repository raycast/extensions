import assert from "node:assert/strict";
import test from "node:test";
import { shouldArmWatchdog } from "./timer-background-policy.ts";

test("arms watchdog only when timer transitions to running in ready state", () => {
  assert.equal(shouldArmWatchdog({ isReady: false, wasRunning: false, isRunning: true }), false);
  assert.equal(shouldArmWatchdog({ isReady: true, wasRunning: true, isRunning: true }), false);
  assert.equal(shouldArmWatchdog({ isReady: true, wasRunning: true, isRunning: false }), false);
  assert.equal(shouldArmWatchdog({ isReady: true, wasRunning: false, isRunning: true }), true);
});
