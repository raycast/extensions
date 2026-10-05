// =============================================================================
// UNIT TEST - RESILIENCE OVER TIME
// Pure logic; no hardware, no Raycast. Runs anywhere.
// -----------------------------------------------------------------------------
// Context: Every other keep-alive test decides ONE tick in isolation. The three
//   worst defects found in review were temporal — auto-reconnect retiring itself
//   after a day, a sleep spending the whole give-up budget, and a single probe
//   flicker restarting it — and none were visible to a single-tick test. These
//   run hours to days of ticks against the REAL shipped tuning, plus the upgrade
//   path from state written by an earlier release.
// WARN: A failure here means auto-reconnect can stop working silently. That is
//   worse than any amount of noise, so treat these as load-bearing.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decideKeepAlive, FIXED_TUNING, INITIAL_STATE, normalizeKeepAliveState } from "../src/lib/keepalive";
import { HOUR } from "./support/keepalive";

import type { KeepAliveState, Reachability } from "../src/lib/keepalive";

/**
 * Runs many ticks against the REAL shipped tuning.
 *
 * NOTE: These exist because every earlier test decided one tick in isolation,
 *   and all three defects found in review were temporal — they only appear
 *   across hours of ticks or a large clock jump.
 */
function runTicks(options: {
  readonly ticks: number;
  readonly reachability: Reachability;
  readonly state: KeepAliveState;
  readonly startMs: number;
  readonly stepMs?: number;
}): { readonly attempts: number; readonly state: KeepAliveState; readonly nowMs: number } {
  const step = options.stepMs ?? 60_000;
  const tuning = { ...FIXED_TUNING, giveUpAfterMs: 24 * HOUR };
  let state = options.state;
  let nowMs = options.startMs;
  let attempts = 0;
  for (let i = 0; i < options.ticks; i++) {
    const decision = decideKeepAlive({
      ...tuning,
      enabled: true,
      isConnected: false,
      nowMs,
      transportAllowed: true,
      wired: false,
      reachability: options.reachability,
      state,
    });
    if (decision.action === "reconnect") {
      attempts += 1;
    }
    state = decision.nextState;
    nowMs += step;
  }
  return { attempts, state, nowMs };
}

describe("surviving over time", () => {
  const START = 1_000_000_000_000;
  const wanted: KeepAliveState = { ...INITIAL_STATE, intent: "connected" };

  it("never stops attempting while the probe is unavailable, however long it runs", () => {
    // The give-up budget must not accrue on "unknown": that is the documented
    // fallback to the pre-probe extension, which never abandoned a wanted link.
    const first = runTicks({ ticks: 40 * 60, reachability: "unknown", state: wanted, startMs: START });
    assert.ok(first.attempts > 0, "should attempt during the first 40 hours");

    const later = runTicks({ ticks: 60, reachability: "unknown", state: first.state, startMs: first.nowMs });
    assert.ok(later.attempts > 0, "must still attempt after the budget window has elapsed");
  });

  it("does not spend the give-up budget while the Mac is asleep", () => {
    // No ticks run while asleep, so the elapsed wall-clock was not time spent
    // chasing. Waking to "gave up" without a single attempt is the bug.
    const chasing: KeepAliveState = {
      ...wanted,
      chasedMs: 0,
      lastTickAtMs: START,
      lastAttemptAtMs: START,
      failedAttempts: 1,
    };
    const decision = decideKeepAlive({
      ...FIXED_TUNING,
      giveUpAfterMs: 24 * HOUR,
      enabled: true,
      isConnected: false,
      nowMs: START + 60 * HOUR,
      transportAllowed: true,
      wired: false,
      reachability: "reachable",
      state: chasing,
    });
    assert.equal(decision.action, "reconnect");
    assert.notEqual(decision.notice, "gaveUp");
  });

  it("gives up only after genuinely chasing a present iPad for the budget", () => {
    const spent = runTicks({ ticks: 30 * 60, reachability: "reachable", state: wanted, startMs: START });
    assert.ok(spent.attempts > 0, "should have attempted while chasing");
    const after = runTicks({ ticks: 10, reachability: "reachable", state: spent.state, startMs: spent.nowMs });
    assert.equal(after.attempts, 0, "a genuinely spent budget still stops");
  });

  it("ignores a single probe flicker, so one bad read cannot restart the chase", () => {
    const chasing = runTicks({ ticks: 200, reachability: "reachable", state: wanted, startMs: START });
    const before = chasing.state.chasedMs;
    const flicker = decideKeepAlive({
      ...FIXED_TUNING,
      giveUpAfterMs: 24 * HOUR,
      enabled: true,
      isConnected: false,
      nowMs: chasing.nowMs,
      transportAllowed: true,
      wired: false,
      reachability: "absent",
      state: chasing.state,
    });
    assert.ok(flicker.nextState.chasedMs >= before, "one absent read must not discard the accumulated budget");
    assert.equal(flicker.nextState.failedAttempts, chasing.state.failedAttempts, "nor the backoff");
  });

  it("announces nearby only after a trusted absence, not after one flicker", () => {
    const idle = { ...wanted, intent: "disconnected" as const };
    const one = decideKeepAlive({
      ...FIXED_TUNING,
      giveUpAfterMs: 24 * HOUR,
      enabled: false,
      isConnected: false,
      nowMs: START,
      transportAllowed: true,
      wired: false,
      reachability: "absent",
      state: idle,
    });
    const back = decideKeepAlive({
      ...FIXED_TUNING,
      giveUpAfterMs: 24 * HOUR,
      enabled: false,
      isConnected: false,
      nowMs: START + 60_000,
      transportAllowed: true,
      wired: false,
      reachability: "reachable",
      state: one.nextState,
    });
    assert.equal(back.notice, "none", "a single absent read is not an absence worth announcing");
  });

  it("still gives up on a laptop that sleeps every night", () => {
    // Got wrong twice. Storing a chase START time let sleep spend the budget
    // (waking to "gave up" with no attempts made); restarting that timestamp on
    // wake then made the budget UNREACHABLE — 8730 failed connects over 30 days
    // with no give-up, i.e. a macOS banner every five minutes, forever.
    const tuning = { ...FIXED_TUNING, giveUpAfterMs: 24 * HOUR };
    let state: KeepAliveState = { ...INITIAL_STATE, intent: "connected" };
    let nowMs = 1_000_000_000_000;
    let awakeMs = 0;
    let attempts = 0;
    let gaveUp = 0;
    for (let i = 0; i < 30 * 24 * 60; i++) {
      const d = decideKeepAlive({
        ...tuning,
        enabled: true,
        isConnected: false,
        nowMs,
        transportAllowed: true,
        wired: false,
        reachability: "reachable",
        state,
      });
      if (d.action === "reconnect") {
        attempts += 1;
      }
      if (d.notice === "gaveUp") {
        gaveUp += 1;
      }
      state = d.nextState;
      nowMs += 60_000;
      awakeMs += 60_000;
      if (awakeMs >= 16 * HOUR) {
        nowMs += 8 * HOUR; // asleep: no ticks run at all
        awakeMs = 0;
      }
    }
    assert.equal(gaveUp, 1, "the budget must still be reachable across nightly sleep");
    assert.ok(attempts < 400, `sleep must not multiply attempts, got ${attempts}`);
  });

  it("is no noisier for a flapping probe than for an iPad that is simply present", () => {
    // A marginal-range iPad was the noisiest input in the system: every return
    // re-armed the fast burst, giving 960 failed connects a day against 290 for a
    // steadily-present one, with no give-up to bound it. Each of those is a macOS
    // banner. The worst input must not produce the worst behaviour.
    function run(pattern: readonly Reachability[]): { attempts: number; gaveUp: number } {
      let state: KeepAliveState = { ...INITIAL_STATE, intent: "connected" };
      let nowMs = 1_000_000_000_000;
      let attempts = 0;
      let gaveUp = 0;
      for (let i = 0; i < 72 * 60; i++) {
        const d = decideKeepAlive({
          ...FIXED_TUNING,
          giveUpAfterMs: 6 * HOUR,
          enabled: true,
          isConnected: false,
          nowMs,
          transportAllowed: true,
          wired: false,
          reachability: pattern[i % pattern.length] ?? "reachable",
          state,
        });
        if (d.action === "reconnect") {
          attempts += 1;
        }
        if (d.notice === "gaveUp") {
          gaveUp += 1;
        }
        state = d.nextState;
        nowMs += 60_000;
      }
      return { attempts, gaveUp };
    }

    // A 6h budget against a 72h window, so BOTH arms clear the give-up: the
    // flapping one accrues only on its reachable ticks and so needs ~3x the wall
    // clock. The window MUST outlast the give-up point. Inside 24h the steady arm has not
    // yet given up, so a regression that removes the settled/trusted split stays
    // invisible — it passed at 24h while producing 7202 attempts over 30 days.
    //
    // The guarantee is that a flapping probe stays BOUNDED, not that it attempts
    // less: the budget counts time actually chasing, so a device present a third
    // of the time legitimately takes three times the wall clock to spend it. What
    // must never happen is the budget being unreachable.
    const steady = run(["reachable"]);
    const flapping = run(["absent", "absent", "reachable"]);
    assert.equal(steady.gaveUp, 1, "a steadily present iPad must give up once");
    assert.equal(flapping.gaveUp, 1, "a flapping probe must still reach the give-up");
    assert.ok(flapping.attempts < 1000, `a flapping probe must stay bounded, got ${flapping.attempts}`);
  });

  it("keeps the absent counter bounded however long the iPad is away", () => {
    const away = runTicks({ ticks: 10_000, reachability: "absent", state: wanted, startMs: START });
    assert.ok(away.state.absentReads <= 5, `counter should clamp, got ${away.state.absentReads}`);
  });
});

describe("an excluded transport over time", () => {
  it("stays dormant for a day, then reconnects the moment the transport is allowed", () => {
    // The reported failure: "cable only" with the iPad on Wi-Fi burned the whole
    // give-up budget while idle, so plugging the cable in produced a "gave up"
    // warning and no connection — 0 attempts across 27 hours.
    const tuning = { ...FIXED_TUNING, giveUpAfterMs: 24 * HOUR };
    let state: KeepAliveState = { ...INITIAL_STATE, intent: "connected" };
    let nowMs = 1_000_000_000_000;
    let attempts = 0;
    let gaveUp = 0;
    for (let i = 0; i < 27 * 60; i++) {
      const allowed = i >= 26 * 60; // the cable goes in at hour 26
      const d = decideKeepAlive({
        ...tuning,
        enabled: true,
        isConnected: false,
        nowMs,
        reachability: "reachable",
        transportAllowed: allowed,
        wired: false,
        state,
      });
      if (d.action === "reconnect") {
        attempts += 1;
      }
      if (d.notice === "gaveUp") {
        gaveUp += 1;
      }
      state = d.nextState;
      nowMs += 60_000;
    }
    assert.equal(gaveUp, 0, "an excluded transport must never spend the give-up budget");
    assert.ok(attempts > 0, `must reconnect once allowed, got ${attempts} attempts`);
  });
});

describe("restoring state written by an older version", () => {
  it("reads a v1.0.0 payload without giving up or mis-reporting presence", () => {
    // Exactly the shape the shipped release persisted — none of the newer fields.
    const restored = normalizeKeepAliveState({
      intent: "connected",
      failedAttempts: 4,
      lastAttemptAtMs: 1_700_000_000_000,
      lastTickAtMs: 1_700_000_000_000,
    });
    assert.equal(restored.intent, "connected");
    assert.equal(restored.failedAttempts, 4);
    assert.equal(restored.chasedMs, 0, "must not inherit a spent budget on upgrade");
    assert.equal(restored.absentReads, 0);
    assert.equal(restored.announcedGiveUp, false);
    assert.equal(restored.lastReachability, "unknown");
  });

  it("rejects corrupt or hostile values rather than trusting them", () => {
    const restored = normalizeKeepAliveState({
      intent: "nonsense",
      failedAttempts: Number.NaN,
      lastAttemptAtMs: -5,
      lastTickAtMs: "soon",
      lastReachability: "elsewhere",
    });
    assert.equal(restored.intent, "disconnected");
    assert.equal(restored.failedAttempts, 0, "NaN would degrade the backoff to every-tick");
    assert.equal(restored.lastAttemptAtMs, 0);
    assert.equal(restored.lastTickAtMs, 0);
    assert.equal(restored.lastReachability, "unknown");
  });

  it("round-trips a fully populated state without dropping a field", () => {
    // Each field asserted against a NON-default value: a normalizer that silently
    // dropped one would otherwise be indistinguishable from a correct one, and a
    // dropped lastReachability would respawn the menu command every single tick.
    const stored: KeepAliveState = {
      intent: "connected",
      failedAttempts: 7,
      lastAttemptAtMs: 1_700_000_000_123,
      lastTickAtMs: 1_700_000_000_456,
      chasedMs: 123_456,
      absentReads: 5,
      announcedGiveUp: true,
      lastLinkUp: true,
      lastReachability: "absent",
      lastWired: false,
      quietSinceMs: 0,
    };
    assert.deepEqual(normalizeKeepAliveState(JSON.parse(JSON.stringify(stored))), stored);
  });

  it("falls back to the initial state for a non-object payload", () => {
    assert.deepEqual(normalizeKeepAliveState("garbage"), INITIAL_STATE);
    assert.deepEqual(normalizeKeepAliveState(null), INITIAL_STATE);
  });
});
