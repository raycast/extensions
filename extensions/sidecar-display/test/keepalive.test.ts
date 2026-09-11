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

import {
  decideKeepAlive,
  effectiveAutoReconnect,
  FIXED_TUNING,
  INITIAL_STATE,
  keepAliveEnabled,
  stateForIntent,
} from "../src/lib/keepalive";
import { connectedState, decide, HOUR, NOW } from "./support/keepalive";

import type { KeepAliveDecision, KeepAliveState, Reachability } from "../src/lib/keepalive";

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
    const away = trustedAbsent({ absentReads: 5, failedAttempts: 9, lastAttemptAtMs: NOW - 30_000 });
    const d = decide({ isConnected: false, state: away, reachability: "reachable" });
    assert.equal(d.action, "reconnect");
    assert.equal(d.nextState.absentReads, 0);
  });

  it("fires a sanity attempt even while absent, so a misreading probe cannot disable reconnect", () => {
    const stale = trustedAbsent({ absentReads: 5, lastAttemptAtMs: NOW - 2 * HOUR, quietSinceMs: NOW - 2 * HOUR });
    assert.equal(decide({ isConnected: false, state: stale, reachability: "absent" }).action, "reconnect");
  });

  it("falls back to plain backoff when the probe is unavailable", () => {
    const d = decide({ isConnected: false, state: connectedState(), reachability: "unknown" });
    assert.equal(d.action, "reconnect");
  });

  it("clears the probe bookkeeping once the link is back", () => {
    const away = trustedAbsent({ absentReads: 5, chasedMs: HOUR });
    const d = decide({ isConnected: true, state: away, reachability: "reachable" });
    assert.equal(d.nextState.absentReads, 0);
    assert.equal(d.nextState.chasedMs, 0);
  });
});

describe("the give-up budget", () => {
  it("stops attempting once a present-but-failing iPad has been chased too long", () => {
    const chasing = connectedState({ chasedMs: 25 * HOUR, lastAttemptAtMs: NOW - HOUR });
    assert.equal(decide({ isConnected: false, state: chasing, reachability: "reachable" }).action, "none");
  });

  it("keeps attempting while still inside the budget", () => {
    const chasing = connectedState({ chasedMs: 23 * HOUR, lastAttemptAtMs: NOW - HOUR });
    assert.equal(decide({ isConnected: false, state: chasing, reachability: "reachable" }).action, "reconnect");
  });

  it("does not burn the budget while the iPad is genuinely away", () => {
    // A weekend trip must not exhaust the budget, or auto-reconnect would be
    // dead on return. The clock only runs while the iPad is detected nearby.
    const away = connectedState({ chasedMs: 100 * HOUR, absentReads: 5, lastAttemptAtMs: NOW - 60_000 });
    const d = decide({ isConnected: false, state: away, reachability: "absent" });
    assert.equal(d.action, "none");
    assert.equal(d.nextState.chasedMs, 0, "a trusted absence discards the spent budget");

    const back = decide({ isConnected: false, state: d.nextState, reachability: "reachable" });
    assert.ok(back.nextState.chasedMs < HOUR, `a returning iPad starts fresh, got ${back.nextState.chasedMs}ms`);
    assert.equal(back.action, "reconnect");
  });

  it("accumulates only the elapsed tick time, never the wall clock", () => {
    // connectedState's previous tick was 60s ago, so exactly one tick accrues —
    // storing a start timestamp instead is what let sleep spend the budget.
    const d = decide({ isConnected: false, state: connectedState(), reachability: "reachable" });
    assert.equal(d.nextState.chasedMs, 60_000);
  });

  it("chases forever when the budget is 0", () => {
    const chasing = connectedState({ chasedMs: 1_000 * HOUR, lastAttemptAtMs: NOW - HOUR });
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

describe("an excluded transport", () => {
  // These exist because deleting the transportAllowed guard entirely used to
  // leave the whole suite green: transport.test.ts proved the predicates and
  // nothing drove the state machine with the flag off.
  it("does not attempt, even when the backoff is long overdue", () => {
    const due = connectedState({ lastAttemptAtMs: NOW - 86_400_000 });
    const d = decide({ isConnected: false, state: due, reachability: "reachable", transportAllowed: false });
    assert.equal(d.action, "none");
  });

  it("does not fire the hourly sanity attempt either", () => {
    // The sanity attempt re-checks a possibly-WRONG probe. Here the probe is
    // right and the user said no, so re-checking would connect the very iPad
    // they excluded — measured at 24 unwanted connects a day.
    const stale = connectedState({ absentReads: 2, lastAttemptAtMs: NOW - 2 * HOUR });
    const d = decide({ isConnected: false, state: stale, reachability: "reachable", transportAllowed: false });
    assert.equal(d.action, "none");
  });

  it("freezes the give-up budget rather than spending it", () => {
    // Spending it while deliberately idle retired auto-reconnect after a day and
    // fired "Gave up reconnecting" at the moment the cable went in.
    const chasing = connectedState({ chasedMs: 5 * HOUR });
    const d = decide({ isConnected: false, state: chasing, reachability: "reachable", transportAllowed: false });
    assert.equal(d.nextState.chasedMs, 5 * HOUR, "the budget must not advance while excluded");
    assert.equal(d.notice, "none", "and it must not announce giving up");
  });

  it("still tracks presence, so the menu bar keeps up", () => {
    const d = decide({
      isConnected: false,
      state: connectedState(),
      reachability: "reachable",
      transportAllowed: false,
      wired: false,
    });
    assert.equal(d.nextState.lastReachability, "reachable");
  });

  it("resumes normally the moment the transport is allowed again", () => {
    const excluded = decide({
      isConnected: false,
      state: connectedState({ lastAttemptAtMs: NOW - HOUR }),
      reachability: "reachable",
      transportAllowed: false,
      wired: false,
    });
    const allowed = decide({
      isConnected: false,
      state: excluded.nextState,
      reachability: "reachable",
      transportAllowed: true,
      wired: false,
    });
    assert.equal(allowed.action, "reconnect");
  });
});

describe("the shipped tuning constants", () => {
  // FIXED_TUNING is no longer user-configurable, so a typo in it would ship
  // silently. These assert the cadence a user actually experiences.
  const T = { ...FIXED_TUNING, giveUpAfterMs: 24 * HOUR };
  const START = 100_000_000;

  function tick(state: KeepAliveState, nowMs: number, reachability: Reachability = "reachable"): KeepAliveDecision {
    return decideKeepAlive({
      ...T,
      enabled: true,
      isConnected: false,
      nowMs,
      reachability,
      transportAllowed: true,
      wired: false,
      state,
    });
  }

  it("makes a quick burst and then settles to the slow heartbeat", () => {
    const wanted: KeepAliveState = { ...INITIAL_STATE, intent: "connected", lastTickAtMs: START - 60_000 };
    let state = wanted;
    let now = START;
    const gaps: number[] = [];
    let previous = 0;
    for (let i = 0; i < 120; i++) {
      const d = tick(state, now);
      if (d.action === "reconnect") {
        if (previous !== 0) {
          gaps.push(now - previous);
        }
        previous = now;
      }
      state = d.nextState;
      now += 60_000;
    }
    // 15s/30s/60s all land inside one 60s tick, so the burst is consecutive
    // ticks; afterwards the 5-minute heartbeat spaces them out.
    // Exact, so a typo in any constant fails here. 15s/30s/60s all fall inside
    // one 60s tick, so the burst is consecutive ticks; then the 5-min heartbeat.
    assert.deepEqual(gaps.slice(0, 2), [60_000, 60_000], "the quick burst is consecutive ticks");
    assert.equal(gaps.filter((gap) => gap < 300_000).length, 2, "exactly fastAttempts-1 quick gaps");
    assert.ok(
      gaps.slice(2).every((gap) => gap === 300_000),
      `heartbeat must be exactly 5 min, saw ${gaps.slice(2).join(",")}`,
    );
  });

  it("rechecks roughly hourly while the iPad reads away", () => {
    const wanted: KeepAliveState = { ...INITIAL_STATE, intent: "connected", lastTickAtMs: START - 60_000 };
    let state = wanted;
    let now = START;
    let attempts = 0;
    for (let i = 0; i < 3 * 60; i++) {
      const d = tick(state, now, "absent");
      if (d.action === "reconnect") {
        attempts += 1;
      }
      state = d.nextState;
      now += 60_000;
    }
    // Three hours away: the debounce lets the first read through, then one
    // sanity attempt per hour. Anything much higher means banners are back.
    // Exact: one read gets through the debounce, then one recheck per hour.
    assert.equal(attempts, 3, `expected 3 attempts in 3h away, got ${attempts}`);
  });

  it("treats a two-minute tick gap as a wake", () => {
    const state: KeepAliveState = {
      ...INITIAL_STATE,
      intent: "connected",
      failedAttempts: 9,
      lastAttemptAtMs: START - 1_000,
      lastTickAtMs: START - 150_000,
    };
    assert.equal(tick(state, START).action, "reconnect", "a gap over wakeGapMs re-arms immediately");
  });
});
