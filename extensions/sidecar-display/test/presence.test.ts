// =============================================================================
// UNIT TEST - PRESENCE SURFACING
// Pure logic; no hardware, no Raycast. Runs anywhere.
// -----------------------------------------------------------------------------
// Context: Proves how the tick reacts to presence transitions — a departure, a
//   cable arriving — and what it ANNOUNCES and when it re-renders the menu bar,
//   as opposed to what it decides to do. The refresh table is exhaustive over
//   every link/presence transition the icon can show, including the steady states
//   that must NOT respawn the menu command.
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldRefreshMenuBar } from "../src/lib/keepalive";
import { connectedState, decide, HOUR, NOW } from "./support/keepalive";

import type { KeepAliveState, Reachability } from "../src/lib/keepalive";

describe("presence notices", () => {
  it("announces a return only when nothing is going to act on it", () => {
    const away = connectedState({ absentReads: 5 });

    const off = decide({ isConnected: false, state: away, reachability: "reachable", enabled: false });
    assert.equal(off.notice, "nearby");
    assert.equal(off.action, "none");

    const disconnected = decide({
      isConnected: false,
      state: { ...away, intent: "disconnected" },
      reachability: "reachable",
    });
    assert.equal(disconnected.notice, "nearby");
  });

  it("stays quiet about a return while auto-reconnect is chasing, since the reconnect is the feedback", () => {
    const away = connectedState({ absentReads: 5, lastAttemptAtMs: NOW - HOUR });
    const d = decide({ isConnected: false, state: away, reachability: "reachable" });
    assert.equal(d.action, "reconnect");
    assert.equal(d.notice, "none");
  });

  it("tracks presence even while switched off, so the return can be spotted at all", () => {
    const d = decide({ isConnected: false, state: connectedState(), reachability: "absent", enabled: false });
    assert.equal(d.nextState.absentReads, 1);
    assert.equal(d.notice, "none");
  });

  it("says nothing when the iPad was never away", () => {
    const d = decide({ isConnected: false, state: connectedState(), reachability: "reachable", enabled: false });
    assert.equal(d.notice, "none");
  });

  it("announces giving up exactly once per chase", () => {
    const spent = connectedState({ chasedMs: 25 * HOUR, lastAttemptAtMs: NOW - HOUR });
    const first = decide({ isConnected: false, state: spent, reachability: "reachable" });
    assert.equal(first.notice, "gaveUp");
    assert.equal(first.action, "none");

    const again = decide({ isConnected: false, state: first.nextState, reachability: "reachable" });
    assert.equal(again.notice, "none", "a spent chase must not repeat the announcement every tick");
  });

  it("re-arms the give-up announcement for a genuinely new chase", () => {
    // The iPad genuinely leaving ends the chase; the next one deserves its own
    // notice. "Genuinely" means a SETTLED absence — several consecutive reads,
    // not one flicker and not the two that merely buy silence.
    const announced = connectedState({ chasedMs: 25 * HOUR, announcedGiveUp: true, absentReads: 4 });
    const away = decide({ isConnected: false, state: announced, reachability: "absent" });
    assert.equal(away.nextState.announcedGiveUp, false);
  });

  it("does not re-arm the give-up announcement on a single flickering read", () => {
    const announced = connectedState({ chasedMs: 25 * HOUR, announcedGiveUp: true });
    const flicker = decide({ isConnected: false, state: announced, reachability: "absent" });
    assert.equal(flicker.nextState.announcedGiveUp, true, "one bad read must not restart the chase");
  });

  it("clears the give-up flag once the link is back", () => {
    const announced = connectedState({ chasedMs: 25 * HOUR, announcedGiveUp: true });
    assert.equal(decide({ isConnected: true, state: announced }).nextState.announcedGiveUp, false);
  });
});

describe("menu-bar refresh", () => {
  /**
   * Every transition the menu bar can display, driven end to end: the `before`
   * state is what the previous tick persisted, and the tick observes `link` and
   * `probe`. `refresh` is whether the icon must be re-rendered.
   */
  const TRANSITIONS: ReadonlyArray<{
    readonly name: string;
    readonly before: Partial<KeepAliveState>;
    readonly link: boolean;
    readonly probe: Reachability;
    readonly enabled: boolean;
    readonly refresh: boolean;
  }> = [
    // Link changes, whoever caused them.
    {
      name: "connected -> dropped",
      before: { lastLinkUp: true },
      link: false,
      probe: "reachable",
      enabled: false,
      refresh: true,
    },
    {
      name: "dropped -> connected",
      before: { lastLinkUp: false },
      link: true,
      probe: "unknown",
      enabled: false,
      refresh: true,
    },
    // Presence changes while disconnected — the states the probe exists for.
    {
      name: "nearby -> away",
      before: { lastLinkUp: false, lastReachability: "reachable" },
      link: false,
      probe: "absent",
      enabled: false,
      refresh: true,
    },
    {
      name: "away -> nearby",
      before: { lastLinkUp: false, lastReachability: "absent", absentReads: 5 },
      link: false,
      probe: "reachable",
      enabled: false,
      refresh: true,
    },
    {
      name: "away -> probe unavailable",
      before: { lastLinkUp: false, lastReachability: "absent", absentReads: 5 },
      link: false,
      probe: "unknown",
      enabled: false,
      refresh: true,
    },
    {
      name: "nearby -> probe unavailable",
      before: { lastLinkUp: false, lastReachability: "reachable" },
      link: false,
      probe: "unknown",
      enabled: false,
      refresh: true,
    },
    {
      name: "probe unavailable -> nearby",
      before: { lastLinkUp: false, lastReachability: "unknown" },
      link: false,
      probe: "reachable",
      enabled: false,
      refresh: true,
    },
    // Steady states must NOT respawn the menu command every minute.
    {
      name: "still connected",
      before: { lastLinkUp: true, lastReachability: "unknown" },
      link: true,
      probe: "unknown",
      enabled: false,
      refresh: false,
    },
    {
      name: "still nearby",
      before: { lastLinkUp: false, lastReachability: "reachable" },
      link: false,
      probe: "reachable",
      enabled: false,
      refresh: false,
    },
    {
      name: "still away",
      before: { lastLinkUp: false, lastReachability: "absent", absentReads: 5 },
      link: false,
      probe: "absent",
      enabled: false,
      refresh: false,
    },
    {
      name: "still unknown",
      before: { lastLinkUp: false, lastReachability: "unknown" },
      link: false,
      probe: "unknown",
      enabled: false,
      refresh: false,
    },
  ];

  for (const t of TRANSITIONS) {
    it(`${t.refresh ? "refreshes" : "stays put"} on ${t.name}`, () => {
      // intent disconnected + disabled keeps the chase out of it, so each case
      // proves the refresh decision itself rather than a side effect of acting.
      const before = connectedState({ intent: "disconnected", lastAttemptAtMs: NOW - 60_000, ...t.before });
      const d = decide({ isConnected: t.link, state: before, reachability: t.probe, enabled: t.enabled });
      assert.equal(shouldRefreshMenuBar(before, d), t.refresh);
    });
  }

  it("refreshes whenever a reconnect is attempted", () => {
    const d = decide({ isConnected: false, state: connectedState(), reachability: "reachable" });
    assert.equal(d.action, "reconnect");
    assert.equal(shouldRefreshMenuBar(connectedState(), d), true);
  });

  it("refreshes when a notice fires, so the HUD and the icon never disagree", () => {
    const away = connectedState({ absentReads: 5, lastReachability: "absent", intent: "disconnected" });
    const d = decide({ isConnected: false, state: away, reachability: "reachable" });
    assert.equal(d.notice, "nearby");
    assert.equal(shouldRefreshMenuBar(away, d), true);
  });

  it("keeps correcting itself when a refresh rendered before the reading settled", () => {
    // The old counter-based test only fired on the first absent read, so one
    // mistimed render left the icon wrong forever. Raw readings self-correct.
    const stale = connectedState({ intent: "disconnected", lastReachability: "reachable", absentReads: 5 });
    const d = decide({ isConnected: false, state: stale, reachability: "absent" });
    assert.equal(shouldRefreshMenuBar(stale, d), true);
  });
});

describe("a corroborated departure", () => {
  it("stays silent when the link drops and the probe says absent in the same tick", () => {
    // One absent read is normally untrusted, because the probe bit dips on its
    // own for ~10s. But a flicker does not take the LINK down with it, so a drop
    // plus an absent read are two independent signals agreeing, and waiting for a
    // second read buys one attempt already known to be doomed.
    const wasUp = connectedState({ lastLinkUp: true, lastAttemptAtMs: NOW - 6 * HOUR });
    const d = decide({ isConnected: false, state: wasUp, reachability: "absent" });
    assert.equal(d.action, "none");
  });

  it("still needs two reads when the link was already down", () => {
    // Without the corroborating drop, a single absent read proves nothing.
    const wasDown = connectedState({ lastLinkUp: false, lastAttemptAtMs: NOW - 6 * HOUR });
    assert.equal(decide({ isConnected: false, state: wasDown, reachability: "absent" }).action, "reconnect");
  });

  it("measures the periodic recheck from going quiet, not from the last attempt", () => {
    // After hours connected the last attempt is ancient, so a recheck clock based
    // on it is already expired the moment the iPad leaves — firing an attempt on
    // the very first quiet tick, which defeats the point of spacing rechecks an
    // hour apart.
    const quiet = connectedState({ absentReads: 2, quietSinceMs: NOW - 60_000, lastAttemptAtMs: NOW - 6 * HOUR });
    assert.equal(decide({ isConnected: false, state: quiet, reachability: "absent" }).action, "none");

    const overdue = connectedState({ absentReads: 2, quietSinceMs: NOW - 2 * HOUR, lastAttemptAtMs: NOW - 6 * HOUR });
    assert.equal(decide({ isConnected: false, state: overdue, reachability: "absent" }).action, "reconnect");
  });

  it("clears the quiet stamp the moment the iPad is seen again", () => {
    const quiet = connectedState({ absentReads: 2, quietSinceMs: NOW - 60_000 });
    assert.equal(decide({ isConnected: false, state: quiet, reachability: "reachable" }).nextState.quietSinceMs, 0);
  });
});

describe("a cable arriving", () => {
  it("counts as a return without waiting out the settle threshold", () => {
    // Bits 2/24 only move when the cable is physically plugged in, so the
    // anti-flap threshold that guards the wireless bit does not apply. Requiring
    // it meant an unplug/replug inside five minutes left the fast burst spent,
    // and the reconnect waited out the five-minute heartbeat.
    const away = connectedState({ absentReads: 2, failedAttempts: 3, lastWired: false, lastAttemptAtMs: NOW - 60_000 });
    const d = decide({ isConnected: false, state: away, reachability: "reachable", wired: true });
    assert.equal(d.action, "reconnect");
    assert.equal(d.nextState.failedAttempts, 1, "the backoff earned while it was gone is cleared");
  });

  it("does not re-arm when the cable was already attached", () => {
    const steady = connectedState({ failedAttempts: 3, lastWired: true, lastAttemptAtMs: NOW - 60_000 });
    const d = decide({ isConnected: false, state: steady, reachability: "reachable", wired: true });
    assert.equal(d.nextState.failedAttempts, 3, "a steady cable is not an arrival");
  });

  it("does not let a wireless flicker claim the same reward", () => {
    const flicker = connectedState({ absentReads: 2, failedAttempts: 3, lastAttemptAtMs: NOW - 60_000 });
    const d = decide({ isConnected: false, state: flicker, reachability: "reachable", wired: false });
    assert.equal(d.nextState.failedAttempts, 3, "wireless needs a settled absence");
  });
});
