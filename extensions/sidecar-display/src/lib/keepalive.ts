// =============================================================================
// KEEP-ALIVE DECISION
// Pure state machine deciding whether a background tick should reconnect.
// -----------------------------------------------------------------------------
// Context: Raycast runs the auto-reconnect command on an interval; there is no
//   on-wake or display-change event, and no way to keep a process resident. Each
//   tick feeds the live link state, a silent reachability probe, and the
//   persisted intent into `decideKeepAlive`, which returns an action and the next
//   state to persist. No I/O happens here, so it is unit-testable.
// WARN: Reconnect fires ONLY when the user wants the iPad connected. A deliberate
//   disconnect is never chased. macOS posts its own error banner for every FAILED
//   connect, so attempts are the scarce resource, not ticks: when the probe says
//   the iPad is absent the tick stays silent and costs nothing.
// NOTE: The probe can be wrong, and a wrong "absent" would silently disable
//   auto-reconnect — a worse failure than noise. Two guards: an absent reading is
//   only trusted after ABSENT_READS_BEFORE_TRUSTED consecutive ticks, and one
//   sanity attempt still fires every `sanityAttemptMs` regardless.
// =============================================================================

/** Whether the user currently wants the iPad connected. */
export type LinkIntent = "connected" | "disconnected";

/** What a keep-alive tick concluded it should do. */
export type KeepAliveAction = "none" | "reconnect";

/**
 * A one-off event this tick should announce, if any.
 *
 * NOTE: "nearby" fires only when nothing is going to act on it — auto-reconnect
 *   off, or a deliberate disconnect. While chasing, the reconnect itself is the
 *   feedback and an extra HUD would just race it.
 */
export type KeepAliveNotice = "none" | "nearby" | "gaveUp";

/**
 * What the silent probe said about the iPad this tick.
 *
 * NOTE: "unknown" is not a failure — it is the honest answer whenever the probe
 *   is unavailable (the BetterDisplay engine, or a Swift call that threw), and it
 *   deliberately falls back to the probe-free backoff behaviour.
 */
export type Reachability = "reachable" | "absent" | "unknown";

/** Persisted keep-alive bookkeeping, carried between background ticks. */
export interface KeepAliveState {
  readonly intent: LinkIntent;
  readonly failedAttempts: number;
  readonly lastAttemptAtMs: number;
  readonly lastTickAtMs: number;
  /** When the current chase began; 0 whenever the clock is not running. */
  readonly chasingSinceMs: number;
  /** Consecutive probe reads reporting the iPad absent (the debounce counter). */
  readonly absentReads: number;
  /** Whether this chase has already announced that it gave up (announce once). */
  readonly announcedGiveUp: boolean;
  /** The link state this tick observed, so the next tick can spot a change. */
  readonly lastLinkUp: boolean;
  /** The probe reading this tick observed — what the menu bar reflects. */
  readonly lastReachability: Reachability;
}

/** The configurable timing knobs for keep-alive. */
export interface KeepAliveTuning {
  readonly fastAttempts: number;
  readonly backoffBaseMs: number;
  readonly backoffCapMs: number;
  readonly dormantRetryMs: number;
  readonly wakeGapMs: number;
  /** How long to keep chasing a reachable-but-failing iPad; 0 means forever. */
  readonly giveUpAfterMs: number;
  /** How often to attempt anyway while the probe claims the iPad is absent. */
  readonly sanityAttemptMs: number;
}

/** Everything a single decision needs: the tuning plus the live snapshot. */
export interface KeepAliveInputs extends KeepAliveTuning {
  readonly enabled: boolean;
  readonly isConnected: boolean;
  readonly nowMs: number;
  readonly reachability: Reachability;
  readonly state: KeepAliveState;
}

/** The action to take now, anything to announce, and the state to persist. */
export interface KeepAliveDecision {
  readonly action: KeepAliveAction;
  readonly notice: KeepAliveNotice;
  readonly nextState: KeepAliveState;
}

// The probe has been observed dipping to "absent" for ~10s while the iPad stayed
// connected, so one clear read is not proof of absence. Requiring two consecutive
// ticks (a minute apart) outlasts that flicker.
const ABSENT_READS_BEFORE_TRUSTED = 2;

/**
 * The retry tuning that is no longer worth exposing.
 *
 * NOTE: These were the whole strategy when the extension was blind and had to
 *   hand-tune its guessing. The presence probe now handles "is the iPad there?",
 *   so what is left governs one narrow case — present, but the connect fails
 *   (device locked, already in use, Wi-Fi trouble) — where the only job is to
 *   space out attempts, since each failure costs a macOS banner. Nobody should
 *   have to tune that, so it is fixed here rather than in preferences.
 */
export const FIXED_TUNING: Omit<KeepAliveTuning, "giveUpAfterMs"> = {
  fastAttempts: 3,
  backoffBaseMs: 15_000,
  backoffCapMs: 60_000,
  dormantRetryMs: 300_000,
  wakeGapMs: 120_000,
  sanityAttemptMs: 3_600_000,
};

/** The state a fresh install (or a manual connect/disconnect) starts from. */
export const INITIAL_STATE: KeepAliveState = {
  intent: "disconnected",
  failedAttempts: 0,
  lastAttemptAtMs: 0,
  lastTickAtMs: 0,
  chasingSinceMs: 0,
  absentReads: 0,
  announcedGiveUp: false,
  lastLinkUp: false,
  lastReachability: "unknown",
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
 * Advances the presence debounce, whatever the tick goes on to decide.
 *
 * @param ticked - This tick's state, with the tick time already recorded.
 * @param inputs - The live snapshot.
 * @returns The state with `absentReads` brought up to date.
 *
 * NOTE: Runs even when auto-reconnect is off or the user disconnected on purpose.
 *   Presence is an observation, not a chase — and tracking it while idle is what
 *   lets a return be announced to someone who has automatic reconnects disabled.
 */
function trackPresence(ticked: KeepAliveState, inputs: KeepAliveInputs): KeepAliveState {
  const absent = inputs.reachability === "absent";
  return { ...ticked, absentReads: absent ? ticked.absentReads + 1 : 0 };
}

/**
 * Whether this tick saw the iPad come back after a trusted absence.
 *
 * @param state  - The state as it was BEFORE this tick's presence update.
 * @param inputs - The live snapshot.
 * @returns True on the transition from absent to reachable.
 */
function justReturned(state: KeepAliveState, inputs: KeepAliveInputs): boolean {
  return inputs.reachability === "reachable" && state.absentReads > 0;
}

/**
 * Advances the chase clock and backoff for a wanted-but-down link.
 *
 * @param seen     - This tick's state, with presence already tracked.
 * @param inputs   - The live snapshot.
 * @param returned - Whether the iPad just came back from a trusted absence.
 * @returns The state with `chasingSinceMs` and the backoff brought up to date.
 *
 * NOTE: The chase clock runs only while the iPad is NOT known-absent. Time spent
 *   with the iPad genuinely away must not burn the give-up budget, or a weekend
 *   trip would exhaust it and auto-reconnect would be dead on return.
 * NOTE: Returning from absence also clears the backoff. Those failures were
 *   earned while the iPad was gone, and making the user wait out a 15-minute
 *   heartbeat after it reappears would defeat the point of probing at all.
 */
function trackChase(seen: KeepAliveState, inputs: KeepAliveInputs, returned: boolean): KeepAliveState {
  const { nowMs, reachability } = inputs;
  const absent = reachability === "absent";
  return {
    ...seen,
    failedAttempts: returned ? 0 : seen.failedAttempts,
    chasingSinceMs: absent ? 0 : seen.chasingSinceMs || nowMs,
    // A fresh chase may announce a fresh give-up.
    announcedGiveUp: absent || returned ? false : seen.announcedGiveUp,
  };
}

/**
 * Whether the give-up budget for this chase is spent.
 *
 * @param state  - The state with the chase clock already advanced.
 * @param inputs - Tuning and the current time.
 * @returns True once a reachable-but-failing iPad has been chased for longer than
 *   `giveUpAfterMs`.
 */
function isBudgetSpent(state: KeepAliveState, inputs: KeepAliveInputs): boolean {
  const { giveUpAfterMs, nowMs } = inputs;
  return giveUpAfterMs > 0 && state.chasingSinceMs > 0 && nowMs - state.chasingSinceMs > giveUpAfterMs;
}

/**
 * Whether the probe is confident enough to skip attempting this tick.
 *
 * @param state  - The state with the debounce counter already advanced.
 * @param inputs - Tuning and the current time.
 * @returns True when the iPad has read absent often enough to trust AND the
 *   periodic sanity attempt is not yet due.
 */
function isSilentlyAbsent(state: KeepAliveState, inputs: KeepAliveInputs): boolean {
  const { nowMs, sanityAttemptMs } = inputs;
  if (state.absentReads < ABSENT_READS_BEFORE_TRUSTED) {
    return false;
  }
  return nowMs - state.lastAttemptAtMs < sanityAttemptMs;
}

/**
 * Applies the backoff schedule to a link that is due for another attempt.
 *
 * @param state    - The state with the chase bookkeeping already advanced.
 * @param inputs   - Tuning and the current time.
 * @param wokeFrom - Whether this tick follows a sleep gap.
 * @returns Reconnect once the backoff window has passed, otherwise wait.
 */
function decideAttempt(state: KeepAliveState, inputs: KeepAliveInputs, wokeFrom: boolean): KeepAliveDecision {
  const { nowMs } = inputs;
  const attempts = wokeFrom ? 0 : state.failedAttempts;
  const waited = wokeFrom ? Number.POSITIVE_INFINITY : nowMs - state.lastAttemptAtMs;

  if (waited < waitFor(attempts, inputs)) {
    return { action: "none", notice: "none", nextState: { ...state, failedAttempts: attempts } };
  }

  return {
    action: "reconnect",
    notice: "none",
    nextState: { ...state, failedAttempts: attempts + 1, lastAttemptAtMs: nowMs },
  };
}

/**
 * Decides whether this tick should reconnect, and the state to persist next.
 *
 * @param inputs - Live link state, probe reading, persisted state, and tuning.
 * @returns The action to take and the next state.
 *
 * NOTE: Order matters. Presence is tracked first and unconditionally. Then: a
 *   live link clears everything; an idle tick (switched off, or a deliberate
 *   disconnect) only announces a return; a spent budget stops the chase and says
 *   so once; a trusted "absent" reading goes silent (bar the sanity attempt);
 *   otherwise the backoff schedule decides, with a sleep gap re-arming.
 */
export function decideKeepAlive(inputs: KeepAliveInputs): KeepAliveDecision {
  const { enabled, isConnected, nowMs, state, wakeGapMs } = inputs;
  // lastLinkUp is stamped on EVERY path, so a link change is visible to the next
  // tick no matter which branch this one took.
  const ticked: KeepAliveState = {
    ...state,
    lastTickAtMs: nowMs,
    lastLinkUp: isConnected,
    lastReachability: inputs.reachability,
  };
  const seen = trackPresence(ticked, inputs);
  const returned = justReturned(state, inputs);

  if (isConnected) {
    const cleared = { ...seen, failedAttempts: 0, chasingSinceMs: 0, announcedGiveUp: false };
    return { action: "none", notice: "none", nextState: cleared };
  }

  // Nothing is going to chase this tick, so a return is worth announcing: it is
  // the only signal the user gets that the iPad is available again.
  if (!enabled || state.intent === "disconnected") {
    return { action: "none", notice: returned ? "nearby" : "none", nextState: seen };
  }

  const wokeFromSleep = state.lastTickAtMs > 0 && nowMs - state.lastTickAtMs > wakeGapMs;
  const tracked = trackChase(seen, inputs, returned);

  if (isBudgetSpent(tracked, inputs)) {
    return {
      action: "none",
      notice: tracked.announcedGiveUp ? "none" : "gaveUp",
      nextState: { ...tracked, announcedGiveUp: true },
    };
  }

  if (isSilentlyAbsent(tracked, inputs)) {
    return { action: "none", notice: "none", nextState: tracked };
  }

  return decideAttempt(tracked, inputs, wokeFromSleep);
}

/**
 * Whether this tick changed anything the menu bar shows.
 *
 * @param before   - The state as it was before the decision.
 * @param decision - What the tick concluded.
 * @returns True when the link or the iPad's presence may have changed.
 *
 * NOTE: A menu-bar command only re-renders when it runs, so a background tick has
 *   to push a refresh for the icon to track reality between clicks. Gated on an
 *   actual change so an idle tick does not respawn the menu command every minute.
 * WARN: The LINK comparison is what catches a drop nobody acted on — the link
 *   falling over during sleep with auto-reconnect off changes no counter, fires
 *   no notice and triggers no attempt, so without it the menu bar would keep
 *   showing "connected" until the user clicked it. Presence alone is not enough.
 * WARN: Presence is compared as the RAW reading, not as the debounced counter.
 *   `absentReads` collapsed to a boolean only ever changes on the 0 -> 1 tick, so
 *   if that one refresh rendered before the reading settled, every later tick
 *   compared true against true and the menu bar stayed wrong forever. Comparing
 *   what the menu bar actually shows is what makes it self-correcting.
 */
export function shouldRefreshMenuBar(before: KeepAliveState, decision: KeepAliveDecision): boolean {
  const linkChanged = before.lastLinkUp !== decision.nextState.lastLinkUp;
  const presenceChanged = before.lastReachability !== decision.nextState.lastReachability;
  return linkChanged || presenceChanged || decision.action === "reconnect" || decision.notice !== "none";
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
  return { ...INITIAL_STATE, intent };
}
