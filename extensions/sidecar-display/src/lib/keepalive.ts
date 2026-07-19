// =============================================================================
// KEEP-ALIVE DECISION
// Pure state machine deciding whether a background tick should reconnect.
// -----------------------------------------------------------------------------
// Context: Raycast runs the auto-reconnect command on an interval; there is no
//   on-wake or display-change event. Each tick feeds the live link state and the
//   persisted intent into `decideKeepAlive`, which returns an action and the
//   next state to persist. No I/O happens here, so it is unit-testable.
// WARN: Reconnect fires ONLY when the user wants the iPad connected. A deliberate
//   disconnect is never chased. The extension never abandons a wanted link
//   permanently: after a fast burst it backs off to a slow heartbeat, and a
//   long gap between ticks (the Mac was asleep) re-arms an immediate attempt.
// =============================================================================

/** Whether the user currently wants the iPad connected. */
export type LinkIntent = "connected" | "disconnected";

/** What a keep-alive tick concluded it should do. */
export type KeepAliveAction = "none" | "reconnect";

/** Persisted keep-alive bookkeeping, carried between background ticks. */
export interface KeepAliveState {
  readonly intent: LinkIntent;
  readonly failedAttempts: number;
  readonly lastAttemptAtMs: number;
  readonly lastTickAtMs: number;
}

/** The configurable timing knobs for keep-alive. */
export interface KeepAliveTuning {
  readonly fastAttempts: number;
  readonly backoffBaseMs: number;
  readonly backoffCapMs: number;
  readonly dormantRetryMs: number;
  readonly wakeGapMs: number;
}

/** Everything a single decision needs: the tuning plus the live snapshot. */
export interface KeepAliveInputs extends KeepAliveTuning {
  readonly enabled: boolean;
  readonly isConnected: boolean;
  readonly nowMs: number;
  readonly state: KeepAliveState;
}

/** The action to take now, plus the state to persist afterwards. */
export interface KeepAliveDecision {
  readonly action: KeepAliveAction;
  readonly nextState: KeepAliveState;
}

/** The state a fresh install (or a manual connect/disconnect) starts from. */
export const INITIAL_STATE: KeepAliveState = {
  intent: "disconnected",
  failedAttempts: 0,
  lastAttemptAtMs: 0,
  lastTickAtMs: 0,
};

/**
 * How long to wait before the next reconnect attempt.
 *
 * @param attempts - Failed attempts so far.
 * @param inputs   - Tuning (fast burst size, backoff bounds, dormant interval).
 * @returns Milliseconds to wait: exponential backoff during the fast burst, then
 *   a fixed slow heartbeat once the burst is spent.
 */
function waitFor(attempts: number, inputs: KeepAliveInputs): number {
  if (attempts >= inputs.fastAttempts) {
    return inputs.dormantRetryMs;
  }
  return Math.min(inputs.backoffBaseMs * 2 ** attempts, inputs.backoffCapMs);
}

/**
 * Decides whether this tick should reconnect, and the state to persist next.
 *
 * @param inputs - Live link state, persisted state, and backoff tuning.
 * @returns The action to take and the next state.
 *
 * NOTE: When disabled, every tick is a no-op. Otherwise: a live link clears the
 *   counter; a long gap since the previous tick means the Mac slept, so the
 *   counter is re-armed and an attempt fires at once; a wanted-but-down link is
 *   chased on backoff, slowing to a heartbeat rather than ever stopping.
 */
export function decideKeepAlive(inputs: KeepAliveInputs): KeepAliveDecision {
  const { enabled, isConnected, nowMs, state, wakeGapMs } = inputs;
  const ticked: KeepAliveState = { ...state, lastTickAtMs: nowMs };

  if (!enabled) {
    return { action: "none", nextState: ticked };
  }

  if (isConnected) {
    return { action: "none", nextState: { ...ticked, failedAttempts: 0 } };
  }

  if (state.intent === "disconnected") {
    return { action: "none", nextState: ticked };
  }

  const wokeFromSleep = state.lastTickAtMs > 0 && nowMs - state.lastTickAtMs > wakeGapMs;
  const attempts = wokeFromSleep ? 0 : state.failedAttempts;
  const waited = wokeFromSleep ? Number.POSITIVE_INFINITY : nowMs - state.lastAttemptAtMs;

  if (waited < waitFor(attempts, inputs)) {
    return { action: "none", nextState: { ...ticked, failedAttempts: attempts } };
  }

  return {
    action: "reconnect",
    nextState: { ...ticked, failedAttempts: attempts + 1, lastAttemptAtMs: nowMs },
  };
}

/**
 * Resolves the effective auto-reconnect switch from its two inputs.
 *
 * @param override    - The menu-bar toggle, or null when never used.
 * @param prefDefault - The preference, used as the default.
 * @returns The menu-bar override when set, otherwise the preference. One switch
 *   with defined precedence, not two competing ones.
 */
export function effectiveAutoReconnect(override: boolean | null, prefDefault: boolean): boolean {
  return override ?? prefDefault;
}

/**
 * Resolves whether a keep-alive tick may reconnect, from every input at once.
 *
 * @param isManual    - True when the user ran the command by hand.
 * @param override    - The menu-bar toggle, or null when never used.
 * @param prefDefault - The auto-reconnect preference (the default).
 * @returns True when the tick may reconnect: always for a manual run (an
 *   explicit "reconnect now"), otherwise the effective switch (override, else
 *   preference). The single composition the command wires straight through, so
 *   the whole enable/override/manual policy is proven by one unit test.
 */
export function keepAliveEnabled(isManual: boolean, override: boolean | null, prefDefault: boolean): boolean {
  return isManual || effectiveAutoReconnect(override, prefDefault);
}

/**
 * Records the user's explicit intent, resetting the retry bookkeeping.
 *
 * @param intent - What the user just asked for.
 * @returns A fresh state anchored to that intent.
 *
 * NOTE: Called whenever the user manually connects or disconnects, so a manual
 *   connect re-arms keep-alive and a manual disconnect stops it dead.
 */
export function stateForIntent(intent: LinkIntent): KeepAliveState {
  return { intent, failedAttempts: 0, lastAttemptAtMs: 0, lastTickAtMs: 0 };
}
