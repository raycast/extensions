// =============================================================================
// TEST SUPPORT - KEEP-ALIVE
// Shared fixtures for the keep-alive decision and presence suites.
// -----------------------------------------------------------------------------
// Context: Both suites drive the same pure state machine and need the same
//   tuning, clock, and starting state. Kept here so neither file duplicates them
//   and they cannot drift apart as the state grows fields.
// =============================================================================

import { decideKeepAlive } from "../../src/lib/keepalive";

import type { KeepAliveDecision, KeepAliveState, KeepAliveTuning, Reachability } from "../../src/lib/keepalive";

export const HOUR = 3_600_000;
export const NOW = 100_000_000;

export const TUNING: KeepAliveTuning = {
  fastAttempts: 3,
  backoffBaseMs: 1_000,
  backoffCapMs: 60_000,
  dormantRetryMs: 900_000,
  wakeGapMs: 180_000,
  giveUpAfterMs: 24 * HOUR,
  sanityAttemptMs: HOUR,
};

/**
 * A state whose last tick was recent, so wake logic stays out of the way.
 *
 * @param overrides - Fields to replace for the case under test.
 * @returns A wanted-connected state anchored just before NOW.
 */
export function connectedState(overrides: Partial<KeepAliveState> = {}): KeepAliveState {
  return {
    intent: "connected",
    failedAttempts: 0,
    lastAttemptAtMs: 0,
    lastTickAtMs: NOW - 60_000,
    chasedMs: 0,
    absentReads: 0,
    announcedGiveUp: false,
    lastLinkUp: false,
    lastReachability: "unknown",
    lastWired: false,
    quietSinceMs: 0,
    ...overrides,
  };
}

/**
 * Runs one decision against the shared tuning and clock.
 *
 * @param input - The live snapshot, plus any tuning to override.
 * @returns The decision.
 *
 * NOTE: Reachability defaults to "unknown" — the probe-free path — so a case that
 *   does not mention the probe exercises the original backoff behaviour.
 */
export function decide(input: {
  isConnected: boolean;
  state: KeepAliveState;
  enabled?: boolean;
  reachability?: Reachability;
  transportAllowed?: boolean;
  wired?: boolean;
  giveUpAfterMs?: number;
  sanityAttemptMs?: number;
}): KeepAliveDecision {
  const { enabled = true, reachability = "unknown", ...rest } = input;
  return decideKeepAlive({
    ...TUNING,
    nowMs: NOW,
    enabled,
    reachability,
    transportAllowed: true,
    wired: false,
    ...rest,
  });
}
