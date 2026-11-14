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
//   auto-reconnect — a worse failure than noise. Three guards: an absent reading
//   is only trusted after ABSENT_READS_BEFORE_TRUSTED consecutive ticks (and
//   EVERY consumer must honour that — see isTrustedAbsent); one sanity attempt
//   still fires every `sanityAttemptMs` regardless; and the give-up clock only
//   advances while the probe positively reports the iPad present, so neither a
//   long absence, a Mac asleep, nor an unanswerable probe can retire the feature.
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
 *   cannot speak (the Swift helper is unavailable, or macOS changed the private
 *   field it reads). It falls back to the probe-free behaviour in BOTH
 *   directions: the backoff runs as before, AND the give-up clock stays stopped,
 *   because the pre-probe extension never abandoned a wanted link.
 */
export type Reachability = "reachable" | "absent" | "unknown";

/** Persisted keep-alive bookkeeping, carried between background ticks. */
export interface KeepAliveState {
  readonly intent: LinkIntent;
  readonly failedAttempts: number;
  readonly lastAttemptAtMs: number;
  readonly lastTickAtMs: number;
  /** Time actually spent chasing this episode; 0 whenever no chase is running. */
  readonly chasedMs: number;
  /** Consecutive probe reads reporting the iPad absent (the debounce counter). */
  readonly absentReads: number;
  /** Whether this chase has already announced that it gave up (announce once). */
  readonly announcedGiveUp: boolean;
  /** The link state this tick observed, so the next tick can spot a change. */
  readonly lastLinkUp: boolean;
  /** The probe reading this tick observed — what the menu bar reflects. */
  readonly lastReachability: Reachability;
  /** Whether a cable was attached this tick, so an arrival can be spotted. */
  readonly lastWired: boolean;
  /** When the tick went quiet on a trusted absence; 0 while not quiet. */
  readonly quietSinceMs: number;
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
  /** False when the iPad is present only on a transport the user excluded. */
  readonly transportAllowed: boolean;
  /** Whether a cable is attached right now (false whenever the probe cannot say). */
  readonly wired: boolean;
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

// Going quiet is cheap and reversible, so two reads is enough for it. Deciding an
// absence ENDED is expensive — it clears the backoff and the give-up budget — so
// it demands a longer absence. Without this gap a marginal-range iPad flapping
// absent/absent/reachable re-armed the fast burst every three ticks: 960 failed
// connects a day (one per 90s) against 290 for an iPad that is simply present and
// failing, and it could never reach the give-up budget. The noisiest input must
// not produce the noisiest behaviour.
const ABSENT_READS_BEFORE_SETTLED = 5;

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
  chasedMs: 0,
  absentReads: 0,
  announcedGiveUp: false,
  lastLinkUp: false,
  lastReachability: "unknown",
  lastWired: false,
  quietSinceMs: 0,
};

/**
 * Reads a stored count back, rejecting anything that is not a sane number.
 *
 * @param value - Whatever JSON.parse produced.
 * @returns The value when it is a finite, non-negative number, otherwise 0.
 *
 * NOTE: `typeof x === "number"` alone admits NaN and negatives, and a NaN in the
 *   backoff arithmetic degrades to "attempt every tick" — the noisy failure this
 *   design exists to prevent.
 */
function storedCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}

/**
 * Rebuilds persisted state from whatever was stored, filling gaps sanely.
 *
 * @param parsed - The decoded LocalStorage payload, of no guaranteed shape.
 * @returns A complete, valid state.
 *
 * NOTE: Lives here rather than beside the storage I/O so the upgrade path is
 *   unit-testable — state.ts imports `@raycast/api` and cannot be. Every field
 *   added after the first release must default to the value that makes state
 *   written by an older version behave correctly: zeroed counters and clocks,
 *   and "unknown" presence, which together mean "nothing observed yet".
 */
export function normalizeKeepAliveState(parsed: unknown): KeepAliveState {
  if (typeof parsed !== "object" || parsed === null) {
    return INITIAL_STATE;
  }
  // SAFETY: guarded by the object/null check above, and every field below is
  // re-validated rather than trusted.
  const raw = parsed as Record<string, unknown>;
  const reachability = raw.lastReachability;
  return {
    intent: raw.intent === "connected" ? "connected" : "disconnected",
    failedAttempts: storedCount(raw.failedAttempts),
    lastAttemptAtMs: storedCount(raw.lastAttemptAtMs),
    lastTickAtMs: storedCount(raw.lastTickAtMs),
    chasedMs: storedCount(raw.chasedMs),
    absentReads: storedCount(raw.absentReads),
    announcedGiveUp: raw.announcedGiveUp === true,
    lastLinkUp: raw.lastLinkUp === true,
    lastReachability: reachability === "reachable" || reachability === "absent" ? reachability : "unknown",
    lastWired: raw.lastWired === true,
    quietSinceMs: storedCount(raw.quietSinceMs),
  };
}

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
function trackPresence(ticked: KeepAliveState, inputs: KeepAliveInputs, linkJustDropped: boolean): KeepAliveState {
  const absent = inputs.reachability === "absent";
  // Clamped: the counter only ever means "trusted yet?", and an iPad left away
  // for a week would otherwise persist a five-figure number to no purpose.
  let seen = Math.min(ticked.absentReads + 1, ABSENT_READS_BEFORE_SETTLED);
  // The debounce exists because the probe bit can dip on its own for ~10s. A
  // flicker does not take the Sidecar link down with it — so a link that just
  // dropped AND an absent read are two independent signals agreeing, and waiting
  // for a second read only buys one connect attempt that is already known to be
  // doomed. Attempts are the scarce resource (each failure can cost a macOS
  // banner), so skip it. Trust it to TRUSTED only, not SETTLED: going quiet is
  // cheap, ending an absence is not.
  //
  // NOTE: This does NOT suppress the banner macOS itself posts when a cabled
  //   session drops in Airplane Mode ("…can't connect wirelessly…"). That one
  //   fires the instant the cable leaves, before any tick runs, and was verified
  //   to appear with auto-reconnect switched off entirely. It is macOS trying to
  //   continue the session wirelessly, and nothing an extension can prevent.
  if (absent && linkJustDropped) {
    seen = Math.max(seen, ABSENT_READS_BEFORE_TRUSTED);
  }
  if (!absent) {
    return { ...ticked, absentReads: 0, quietSinceMs: 0 };
  }
  // Stamped when the tick FIRST goes quiet, so the periodic recheck below is
  // measured from then rather than from the last attempt. Measuring from the
  // attempt meant that after hours connected the recheck clock was already
  // expired, so the very first quiet tick fired one anyway — an attempt against
  // an iPad we had just decided was absent, which is exactly what the recheck is
  // meant to space out by an hour.
  const quiet = seen >= ABSENT_READS_BEFORE_TRUSTED && ticked.quietSinceMs === 0 ? inputs.nowMs : ticked.quietSinceMs;
  return { ...ticked, absentReads: seen, quietSinceMs: quiet };
}

/**
 * Whether an absent reading has been seen often enough to act on.
 *
 * @param state - The state carrying the debounce counter.
 * @returns True once absence has held for ABSENT_READS_BEFORE_TRUSTED ticks.
 *
 * WARN: EVERY consumer of "the iPad is absent" must go through this. The probe
 *   bit has been observed dipping for ~10s while the iPad stayed connected, and
 *   a single raw read previously reached the chase clock and the backoff — so one
 *   flicker restarted the give-up budget and bought a burst of failed connects,
 *   each costing the macOS banner this whole design exists to avoid.
 */
function isTrustedAbsent(state: KeepAliveState): boolean {
  return state.absentReads >= ABSENT_READS_BEFORE_TRUSTED;
}

/**
 * Whether the iPad has been absent long enough to call the absence over on return.
 *
 * @param state - The state carrying the debounce counter.
 * @returns True once absence has held for ABSENT_READS_BEFORE_SETTLED ticks.
 *
 * WARN: Clearing the backoff and the give-up budget is what makes a return cheap,
 *   and a flapping probe can otherwise claim that reward every few ticks. Only a
 *   settled absence earns it.
 */
function isSettledAbsence(state: KeepAliveState): boolean {
  return state.absentReads >= ABSENT_READS_BEFORE_SETTLED;
}

/**
 * Whether this tick saw the iPad come back after a trusted absence.
 *
 * @param state  - The state as it was BEFORE this tick's presence update.
 * @param inputs - The live snapshot.
 * @returns True on the transition from a SETTLED absence back to reachable.
 */
function justReturned(state: KeepAliveState, inputs: KeepAliveInputs): boolean {
  if (inputs.reachability !== "reachable") {
    return false;
  }
  // A cable appearing is a deliberate physical act — bits 2/24 only move when it
  // is plugged in — so the anti-flap threshold does not apply to it. Requiring a
  // SETTLED absence here meant an unplug-and-replug inside five minutes never
  // counted as a return, so failures accrued while the iPad was GONE were still
  // charged against it once it was back: the fast burst was already spent and the
  // reconnect waited out the five-minute heartbeat.
  return isSettledAbsence(state) || (inputs.wired && !state.lastWired);
}

/**
 * Advances the chase clock and backoff for a wanted-but-down link.
 *
 * @param seen     - This tick's state, with presence already tracked.
 * @param inputs   - The live snapshot.
 * @param returned - Whether the iPad just came back from a trusted absence.
 * @returns The state with `chasedMs` and the backoff brought up to date.
 *
 * WARN: The clock advances ONLY while the probe positively reports the iPad
 *   present. "absent" stops it so a weekend away cannot exhaust the budget — and
 *   "unknown" stops it too, because an unavailable probe must behave like the
 *   pre-probe extension, which never gave up at all. Letting "unknown" accrue
 *   made the budget expire after a day and left auto-reconnect permanently
 *   dormant for anyone whose probe could not answer.
 * WARN: The budget ACCUMULATES elapsed tick time rather than storing a start
 *   timestamp, and each tick may contribute at most `wakeGapMs`. This is the only
 *   shape that survives a laptop. Wall-clock since a start time counted sleep and
 *   produced "gave up" on wake with no attempts made; restarting that timestamp on
 *   wake then made the budget UNREACHABLE — a Mac sleeping nightly never gave up
 *   at all, which is the banner storm this feature exists to end. Accumulating
 *   needs no wake special-case: no ticks run while asleep, so nothing accrues.
 * NOTE: Returning from absence also clears the backoff. Those failures were
 *   earned while the iPad was gone, and making the user wait out a 15-minute
 *   heartbeat after it reappears would defeat the point of probing at all.
 */
function trackChase(seen: KeepAliveState, inputs: KeepAliveInputs, returned: boolean): KeepAliveState {
  const { nowMs, reachability, state, wakeGapMs } = inputs;
  // Three outcomes, and the difference between the last two is the whole bug
  // history of this function:
  //   accrue  — the probe positively says present, so we ARE chasing.
  //   reset   — the chase genuinely ended (settled absence, or a return).
  //   freeze  — anything else: "unknown", or an absence not yet settled.
  // Freezing is NOT the same as resetting. Resetting on "unknown" let a single
  // unanswerable read per day discard a whole day of budget, so the give-up
  // could never fire: 8642 failed connects over 30 days, one macOS banner each.
  const settled = isSettledAbsence(seen);
  const accruing = reachability === "reachable" && !settled;
  const ended = settled || returned;
  // Capped per tick, so a sleep gap or a delayed schedule contributes only what a
  // normal tick would rather than the whole wall-clock it spanned.
  const sinceLastTick = state.lastTickAtMs === 0 ? 0 : Math.max(nowMs - state.lastTickAtMs, 0);
  return {
    ...seen,
    failedAttempts: returned ? 0 : seen.failedAttempts,
    chasedMs: ended ? 0 : accruing ? seen.chasedMs + Math.min(sinceLastTick, wakeGapMs) : seen.chasedMs,
    // A genuinely new chase may announce a fresh give-up.
    announcedGiveUp: ended ? false : seen.announcedGiveUp,
  };
}

/**
 * Whether the give-up budget for this chase is spent.
 *
 * @param state  - The state with the chase clock already advanced.
 * @param inputs - Tuning (the budget ceiling).
 * @returns True once a reachable-but-failing iPad has been chased for longer than
 *   `giveUpAfterMs`.
 */
function isBudgetSpent(state: KeepAliveState, inputs: KeepAliveInputs): boolean {
  return inputs.giveUpAfterMs > 0 && state.chasedMs > inputs.giveUpAfterMs;
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
  // Trusted, not settled: going quiet is cheap and reverses itself the moment the
  // iPad reads present again, so it needs far less evidence than deciding an
  // absence is over. The two thresholds are deliberately different.
  if (!isTrustedAbsent(state)) {
    return false;
  }
  // From whichever happened later: the last attempt, or the moment we went quiet.
  const since = Math.max(state.lastAttemptAtMs, state.quietSinceMs);
  return nowMs - since < sanityAttemptMs;
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
  const linkJustDropped = state.lastLinkUp && !isConnected;
  const ticked: KeepAliveState = {
    ...state,
    lastTickAtMs: nowMs,
    lastLinkUp: isConnected,
    lastReachability: inputs.reachability,
    lastWired: inputs.wired,
  };
  const seen = trackPresence(ticked, inputs, linkJustDropped);
  const returned = justReturned(state, inputs);

  if (isConnected) {
    const cleared = { ...seen, failedAttempts: 0, chasedMs: 0, announcedGiveUp: false };
    return { action: "none", notice: "none", nextState: cleared };
  }

  // Nothing is going to chase this tick, so a return is worth announcing: it is
  // the only signal the user gets that the iPad is available again.
  if (!enabled || state.intent === "disconnected") {
    return { action: "none", notice: returned ? "nearby" : "none", nextState: seen };
  }

  // An excluded transport is a DECISION, not an uncertainty, so it is silent
  // outright — no attempt, and no sanity attempt either. The sanity attempt
  // exists to re-check a possibly-wrong probe; here the probe is right and the
  // user has simply said no, so re-checking would connect the very iPad they
  // asked us to leave alone.
  //
  // WARN: This returns `seen`, NOT a chase-tracked state, and it MUST come before
  //   trackChase. We are not chasing, so the give-up budget must not advance —
  //   exactly as it does not advance on "unknown". Accruing here spent the whole
  //   budget while deliberately idle, so "cable only" went permanently dormant
  //   after a day and greeted the cable going in with "Gave up reconnecting":
  //   0 attempts across 27 simulated hours, including the hour it was plugged in.
  if (!inputs.transportAllowed) {
    return { action: "none", notice: "none", nextState: seen };
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
