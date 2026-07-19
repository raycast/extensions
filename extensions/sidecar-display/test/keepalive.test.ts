// =============================================================================
// UNIT TEST - KEEP-ALIVE DECISION
// Pure logic; no hardware, no BetterDisplay. Runs anywhere.
// -----------------------------------------------------------------------------
// Context: Proves the state machine reconnects a self-dropped link, backs off,
//   slows to a heartbeat (never abandons), re-arms instantly after the Mac
//   sleeps, and never fights a deliberate disconnect.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decideKeepAlive,
  effectiveAutoReconnect,
  INITIAL_STATE,
  keepAliveEnabled,
  stateForIntent,
} from "../src/lib/keepalive";

import type { KeepAliveDecision, KeepAliveState, KeepAliveTuning } from "../src/lib/keepalive";

const TUNING: KeepAliveTuning = {
  fastAttempts: 3,
  backoffBaseMs: 1_000,
  backoffCapMs: 60_000,
  dormantRetryMs: 900_000,
  wakeGapMs: 180_000,
};
const NOW = 10_000_000;

/** A recent tick (not a sleep gap), so wake logic stays out of the way. */
function connectedState(overrides: Partial<KeepAliveState> = {}): KeepAliveState {
  return {
    intent: "connected",
    failedAttempts: 0,
    lastAttemptAtMs: 0,
    lastTickAtMs: NOW - 60_000,
    ...overrides,
  };
}

function decide(input: {
  isConnected: boolean;
  state: KeepAliveState;
  enabled?: boolean;
}): KeepAliveDecision {
  const { enabled = true, ...rest } = input;
  return decideKeepAlive({ ...TUNING, nowMs: NOW, enabled, ...rest });
}

describe("keep-alive decisions", () => {
  it("does nothing when the user wants it disconnected", () => {
    const state = { ...connectedState(), intent: "disconnected" as const };
    assert.equal(decide({ isConnected: false, state }).action, "none");
  });

  it("does nothing when auto-reconnect is switched off, even for a wanted dropped link", () => {
    const state = connectedState({ failedAttempts: 2 });
    const d = decide({ isConnected: false, state, enabled: false });
    assert.equal(d.action, "none");
    // Records the tick (no false sleep-gap on re-enable) but leaves the rest of
    // the state untouched — a disabled tick is inert, not a reset.
    assert.equal(d.nextState.lastTickAtMs, NOW);
    assert.equal(d.nextState.intent, "connected");
    assert.equal(d.nextState.failedAttempts, 2);
  });

  it("does nothing and clears the counter when already connected", () => {
    const d = decide({ isConnected: true, state: connectedState({ failedAttempts: 2 }) });
    assert.equal(d.action, "none");
    assert.equal(d.nextState.failedAttempts, 0);
  });

  it("reconnects a link that dropped on its own, and counts the attempt", () => {
    const d = decide({ isConnected: false, state: connectedState() });
    assert.equal(d.action, "reconnect");
    assert.equal(d.nextState.failedAttempts, 1);
  });

  it("waits out the backoff window, then retries once it passes", () => {
    const tooSoon = connectedState({ failedAttempts: 1, lastAttemptAtMs: NOW - 500 });
    assert.equal(decide({ isConnected: false, state: tooSoon }).action, "none");

    const due = connectedState({ failedAttempts: 1, lastAttemptAtMs: NOW - 5_000 });
    assert.equal(decide({ isConnected: false, state: due }).action, "reconnect");
  });

  it("slows to a heartbeat after the fast burst but never abandons", () => {
    const spent = connectedState({ failedAttempts: 3, lastAttemptAtMs: NOW - 60_000 });
    assert.equal(decide({ isConnected: false, state: spent }).action, "none");

    const heartbeatDue = connectedState({ failedAttempts: 3, lastAttemptAtMs: NOW - 1_000_000 });
    const d = decide({ isConnected: false, state: heartbeatDue });
    assert.equal(d.action, "reconnect");
    assert.equal(d.nextState.failedAttempts, 4);
  });

  it("reconnects immediately after waking, resetting the counter", () => {
    const asleep = connectedState({
      failedAttempts: 20,
      lastAttemptAtMs: NOW - 60_000,
      lastTickAtMs: NOW - 1_200_000,
    });
    const d = decide({ isConnected: false, state: asleep });
    assert.equal(d.action, "reconnect");
    assert.equal(d.nextState.failedAttempts, 1);
  });

  it("records the tick time on every decision, so wake detection works next time", () => {
    const d = decide({ isConnected: false, state: connectedState() });
    assert.equal(d.nextState.lastTickAtMs, NOW);
  });
});

describe("intent", () => {
  it("re-arms cleanly for a manual connect", () => {
    assert.equal(stateForIntent("connected").failedAttempts, 0);
    assert.equal(stateForIntent("connected").intent, "connected");
  });

  it("starts disconnected on a fresh install", () => {
    assert.equal(INITIAL_STATE.intent, "disconnected");
  });
});

describe("effectiveAutoReconnect", () => {
  it("follows the preference when the menu toggle was never used", () => {
    assert.equal(effectiveAutoReconnect(null, true), true);
    assert.equal(effectiveAutoReconnect(null, false), false);
  });

  it("lets the menu-bar override win over the preference default", () => {
    assert.equal(effectiveAutoReconnect(false, true), false);
    assert.equal(effectiveAutoReconnect(true, false), true);
  });
});

describe("keepAliveEnabled", () => {
  it("lets a manual run act for every override/preference combination", () => {
    for (const override of [null, true, false] as const) {
      for (const pref of [true, false] as const) {
        assert.equal(keepAliveEnabled(true, override, pref), true, `manual, override=${override}, pref=${pref}`);
      }
    }
  });

  it("follows the preference on a background tick when the toggle was never used", () => {
    assert.equal(keepAliveEnabled(false, null, true), true);
    assert.equal(keepAliveEnabled(false, null, false), false);
  });

  it("lets the menu override win over the preference on a background tick", () => {
    assert.equal(keepAliveEnabled(false, false, true), false, "override off beats pref on");
    assert.equal(keepAliveEnabled(false, true, false), true, "override on beats pref off");
  });
});
