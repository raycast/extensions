// =============================================================================
// UNIT TEST - KEEP-ALIVE DECISION
// Pure logic; no hardware, no BetterDisplay. Runs anywhere.
// -----------------------------------------------------------------------------
// Context: Proves the state machine reconnects a self-dropped link, backs off,
//   slows to a heartbeat, parks once the retry budget is spent (so an
//   unreachable iPad stops generating macOS error banners), re-arms after the
//   Mac sleeps, and never fights a deliberate disconnect.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { effectiveAutoReconnect, INITIAL_STATE, keepAliveEnabled, stateForIntent } from "../src/lib/keepalive";
import { connectedState, decide, HOUR, NOW } from "./support/keepalive";

import type { KeepAliveState } from "../src/lib/keepalive";

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

  it("slows to a heartbeat after the fast burst, and with the cap off never abandons", () => {
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

describe("the silent reachability probe", () => {
  /** State that has already read absent enough times to be trusted. */
  function trustedAbsent(overrides: Partial<KeepAliveState> = {}): KeepAliveState {
    return connectedState({ absentReads: 1, lastAttemptAtMs: NOW - 60_000, ...overrides });
  }

  it("does not attempt when the iPad has read absent on consecutive ticks", () => {
    const d = decide({ isConnected: false, state: trustedAbsent(), reachability: "absent" });
    assert.equal(d.action, "none");
    assert.equal(d.nextState.absentReads, 2);
  });

  it("still attempts on a single absent read, because the probe flickers", () => {
    // The underlying status bit was observed dipping for ~10s with the iPad
    // connected, so one clear read must never be trusted as proof of absence.
    const first = decide({ isConnected: false, state: connectedState(), reachability: "absent" });
    assert.equal(first.action, "reconnect");
    assert.equal(first.nextState.absentReads, 1);
  });

  it("reconnects the moment the iPad comes back, without waiting out the backoff", () => {
    // 9 failed attempts would normally impose the 15-minute heartbeat, but those
    // failures were earned while the iPad was away — returning clears the slate.
    const away = trustedAbsent({ absentReads: 40, failedAttempts: 9, lastAttemptAtMs: NOW - 30_000 });
    const d = decide({ isConnected: false, state: away, reachability: "reachable" });
    assert.equal(d.action, "reconnect");
    assert.equal(d.nextState.absentReads, 0);
  });

  it("fires a sanity attempt even while absent, so a misreading probe cannot disable reconnect", () => {
    const stale = trustedAbsent({ absentReads: 500, lastAttemptAtMs: NOW - 2 * HOUR });
    assert.equal(decide({ isConnected: false, state: stale, reachability: "absent" }).action, "reconnect");
  });

  it("falls back to plain backoff when the probe is unavailable", () => {
    const d = decide({ isConnected: false, state: connectedState(), reachability: "unknown" });
    assert.equal(d.action, "reconnect");
  });

  it("clears the probe bookkeeping once the link is back", () => {
    const away = trustedAbsent({ absentReads: 30, chasingSinceMs: NOW - HOUR });
    const d = decide({ isConnected: true, state: away, reachability: "reachable" });
    assert.equal(d.nextState.absentReads, 0);
    assert.equal(d.nextState.chasingSinceMs, 0);
  });
});

describe("the give-up budget", () => {
  it("stops attempting once a present-but-failing iPad has been chased too long", () => {
    const chasing = connectedState({ chasingSinceMs: NOW - 25 * HOUR, lastAttemptAtMs: NOW - HOUR });
    assert.equal(decide({ isConnected: false, state: chasing, reachability: "reachable" }).action, "none");
  });

  it("keeps attempting while still inside the budget", () => {
    const chasing = connectedState({ chasingSinceMs: NOW - 23 * HOUR, lastAttemptAtMs: NOW - HOUR });
    assert.equal(decide({ isConnected: false, state: chasing, reachability: "reachable" }).action, "reconnect");
  });

  it("does not burn the budget while the iPad is genuinely away", () => {
    // A weekend trip must not exhaust the budget, or auto-reconnect would be
    // dead on return. The clock only runs while the iPad is detected nearby.
    const away = connectedState({ chasingSinceMs: NOW - 100 * HOUR, absentReads: 5, lastAttemptAtMs: NOW - 60_000 });
    const d = decide({ isConnected: false, state: away, reachability: "absent" });
    assert.equal(d.action, "none");
    assert.equal(d.nextState.chasingSinceMs, 0);

    const back = decide({ isConnected: false, state: d.nextState, reachability: "reachable" });
    assert.equal(back.nextState.chasingSinceMs, NOW, "clock restarts rather than resuming a spent budget");
    assert.equal(back.action, "reconnect");
  });

  it("starts the clock on the first tick of a chase", () => {
    const d = decide({ isConnected: false, state: connectedState(), reachability: "reachable" });
    assert.equal(d.nextState.chasingSinceMs, NOW);
  });

  it("chases forever when the budget is 0", () => {
    const chasing = connectedState({ chasingSinceMs: NOW - 1_000 * HOUR, lastAttemptAtMs: NOW - HOUR });
    const d = decide({ isConnected: false, state: chasing, reachability: "reachable", giveUpAfterMs: 0 });
    assert.equal(d.action, "reconnect");
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
