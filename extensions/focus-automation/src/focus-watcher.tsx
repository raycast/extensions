import {
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  open,
} from "@raycast/api";
import { logEvent, logSystem, logLiveness, LOG_PATH } from "./lib/logger";
import { getAccessTokenSilently } from "./lib/oauth";
import { fetchUpcomingEvents, PolledEvent } from "./lib/gcal";
import {
  filterEvents,
  selectNextEvent,
  focusDurationSeconds,
} from "./lib/decision";
import {
  WATCHER_LOCK_STALE_SECONDS,
  FOCUS_CATEGORIES,
  CONFIRM_TIMEOUT_SECONDS,
} from "./lib/constants";
import * as state from "./lib/state";
import {
  loadLogState,
  saveLogState,
  loadSysState,
  saveSysState,
  loadLastCount,
  saveLastCount,
  getSelectedCalendarId,
  loadWatcherLock,
  setWatcherLock,
  clearWatcherLock,
  loadActiveSession,
  saveActiveSession,
  LogState,
  SysState,
} from "./lib/watcher-store";

// Phase C4 — the trigger path (builds on C3's decision rules).
//
// Each 60s tick reads the chosen calendar (C2), runs the fetched list through
// the daemon's filter + selection logic (C3), logs skips and the would-fire
// winner (SCHEDULED), and — new in C4 — FIRES when the winner's start has been
// reached (never before: decision 1, winner.start <= now). Firing means: skip
// if a modeled session is still running, mark processed, model the new session
// window, then prompt (confirm) or trigger (auto). `dryRun` gates only the side
// effect; the whole decision pipeline still runs. C4.b ships this behind dryRun.
//
// Key constraint: this runs as a fresh process every tick, so anything the
// daemon kept in RAM (dedup markers, last count, processed events, the active
// session) lives in LocalStorage via ./lib/state and ./lib/watcher-store. The
// decision rules themselves are pure (./lib/decision); the watcher applies the
// transition-guarded logging and the fire side effects around them. The whole
// tick is serialized by the C4.a write-race lock. See specs/phase-c4-trigger.md.

type Preferences = {
  triggerMode: "auto" | "confirm";
  dryRun?: boolean; // removed from manifest (dev-only gate); defaults to true in dev
};

export default async function FocusWatcher() {
  const prefs = getPreferenceValues<Preferences>();
  const dryRun = environment.isDevelopment ? (prefs.dryRun ?? true) : false;
  const launchedInBackground = environment.launchType === LaunchType.Background;
  const tickStart = new Date();

  // 0. Write-race guard (C4.a). Raycast can overlap background ticks; the daemon
  //    never could (one process, sleeping between polls). Bail quietly if another
  //    tick stamped a lock less than WATCHER_LOCK_STALE_SECONDS ago. A stale lock
  //    (a tick that crashed before clearing it) self-heals: we take over. A
  //    future-dated lock (clock skew) reads as fresh and bails — the safe side.
  //    This is a mitigation, not a mutex (no atomic get-set in LocalStorage); it
  //    shrinks the overlap window to ~ms. We only clear the lock on paths that
  //    acquired it — the early return below must not touch another tick's lock.
  const existingLock = await loadWatcherLock();
  if (existingLock !== null) {
    const lockAgeSeconds =
      (tickStart.getTime() - existingLock.getTime()) / 1000;
    if (lockAgeSeconds < WATCHER_LOCK_STALE_SECONDS) {
      // Unconditional (unlike the poll-OK line below): the bail is the only
      // evidence the guard fired, and real ticks run as Background — gating it
      // on a foreground launch would hide it during the very scenario it guards.
      // This is stdout for the `ray develop` console, never the focus.log sink,
      // so "bail quietly" (no event line, no Phase D diff noise) still holds.
      console.log(
        `[focus-watcher] tick skipped — watcher_lock held ${lockAgeSeconds.toFixed(1)}s ago (< ${WATCHER_LOCK_STALE_SECONDS}s)`,
      );
      return;
    }
  }
  await setWatcherLock(tickStart);

  // Liveness fields (D.3.a). Captured during the tick, read in `finally` to emit
  // exactly one UNCONDITIONAL heartbeat per tick — including ticks that return
  // early (no auth / no calendar) or throw. Default null = "tick errored or
  // returned before this point", which the heartbeat renders distinctly.
  // See specs/phase-d3a-liveness-heartbeat.md.
  let eventsFetched: number | null = null;
  let liveWinner: PolledEvent | null = null;

  try {
    // 1. Auth, refresh-only. A background command has no UI, so it must never
    //    start the interactive browser flow. No token => not onboarded yet.
    const token = await getAccessTokenSilently();
    if (!token) {
      await logOnce(
        "auth",
        "[watcher] No Google authorization yet. Waiting for onboarding; skipping poll.",
      );
      return;
    }

    // 2. Calendar selection, name-agnostic. Reads the id the D.5 onboarding
    //    picker stored (any calendar, any name).
    const calendarId = await getSelectedCalendarId();
    if (!calendarId) {
      await logOnce(
        "calendar",
        "[watcher] No calendar selected. Waiting for onboarding; skipping poll.",
      );
      return;
    }

    // 3. Fetch the next 14h of events on that calendar.
    const events = await fetchUpcomingEvents(token, calendarId);
    eventsFetched = events.length; // for the liveness heartbeat (D.3.a)

    // 4. Count heartbeat, transition-only. Persisted because this process can't
    //    hold the last count in memory across ticks (mirrors the daemon's
    //    _last_event_count guard).
    const lastCount = await loadLastCount();
    if (lastCount !== events.length) {
      logSystem(
        `[watcher] Poll complete — ${events.length} event(s) fetched from GCal.`,
      );
      await saveLastCount(events.length);
    }

    // 5. Decision rules (C3). Run the fetched list through the daemon's filter
    //    + selection logic and log the outcome. Still LOG-ONLY: the winner is
    //    logged as SCHEDULED (would-fire), no timer is armed and no trigger
    //    fires. Firing lands in C4. Every line is transition-guarded via
    //    LocalStorage (the stateless-tick fix).
    const processed = await state.load();
    const logState = await loadLogState();
    const currentIds = new Set(events.map((e) => e.id));

    // Capture `now` once per poll and reuse it for the missed-window check and
    // the would-fire countdown, mirroring the daemon's single `now` in
    // filter_events. Per-event capture could classify equal-aged events
    // differently on a slow poll.
    const now = new Date();

    // Filter: log each skip with its first-failing reason, in daemon order
    // (all-day → short → duplicate → missed).
    const { qualifying, skipped } = filterEvents(events, processed, now);
    for (const { action, event } of skipped) {
      logIfChanged(logState, action, event);
    }

    // Select: pick the next event; log same-start losers as SKIPPED_OVERLAP.
    const { winner, overlapped } = selectNextEvent(qualifying);
    liveWinner = winner; // for the liveness heartbeat (D.3.a)
    for (const event of overlapped) {
      logIfChanged(logState, "SKIPPED_OVERLAP", event);
    }

    // Would-fire: log the winner as SCHEDULED (+XmYYs). The countdown is
    // display-only; the transition guard keys on the bare "SCHEDULED" + start
    // (via guardAction) so the line logs once per (winner, start), not once per
    // tick as the countdown shrinks — mirroring pipeline.schedule_next.
    if (winner && winner.start) {
      const delayMs = Math.max(0, winner.start.getTime() - now.getTime());
      const totalSeconds = Math.floor(delayMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const action = `SCHEDULED (+${minutes}m${String(seconds).padStart(2, "0")}s)`;
      logIfChanged(logState, action, winner, "SCHEDULED");
    }

    // Fire (C4). The winner is logged SCHEDULED above (would-fire countdown);
    // once its start has been reached — never before (decision 1) — this tick
    // fires instead of just counting down. The missed filter bounds the late
    // side at start + MISSED_GRACE_SECONDS (120s since the D.3.c-fix), so the
    // fire lands in [start, start + 120s] — wide enough that a skipped poll tick
    // can't drop it. The daemon's line order is SCHEDULED then the fire action;
    // keeping the SCHEDULED block above preserves that on the same tick when an
    // event is first seen already-started. dryRun gates the side effect inside.
    if (winner && winner.start && winner.start.getTime() <= now.getTime()) {
      await fireWinner(
        winner,
        winner.start,
        now,
        processed,
        logState,
        dryRun,
        prefs.triggerMode,
      );
    }

    // Forget log markers for events GCal no longer returns, so the map can't
    // grow forever (mirrors the cleanup in pipeline.schedule_next).
    for (const id of Object.keys(logState)) {
      if (!currentIds.has(id)) delete logState[id];
    }
    await saveLogState(logState);

    // Clear one-shot system flags after a clean poll, so a later auth/calendar
    // failure logs again instead of being suppressed (mirrors the daemon
    // resetting _auth_failure_notified on a successful poll).
    await clearSysFlags();

    if (!launchedInBackground) {
      console.log(
        `[focus-watcher] poll OK mode=${prefs.triggerMode} dryRun=${dryRun} — ${events.length} events, logging to ${LOG_PATH}`,
      );
    }
  } catch (e) {
    const msg = String(e);
    // A dead login must read distinctly from a network blip, so route it to the
    // re-auth line (C4.a). Three shapes mean "the token is gone, re-consent
    // needed": Google's invalid_grant on a revoked refresh token, our own
    // refreshTokens wrapper ("Token refresh failed:"), and the gcal fetch
    // wrappers rejecting the access token ("... failed: 401"). Anything else is
    // treated as transient and retried next cycle.
    const needsReauth =
      msg.includes("invalid_grant") ||
      msg.includes("Token refresh failed:") ||
      msg.includes("failed: 401");
    if (needsReauth) {
      await logOnce(
        "auth",
        "[watcher] Auth error: GCal token expired or revoked. Re-authorization required.",
      );
    } else {
      // Transition-guarded by message so a persistent failure doesn't write an
      // identical line every 60s.
      await logOnce(
        "error",
        `[watcher] Poll error (will retry next cycle): ${msg}`,
      );
    }
  } finally {
    // Unconditional per-tick liveness heartbeat (D.3.a). Runs on every tick that
    // reaches the try — healthy, early-return (no auth / no calendar), or thrown
    // — so a silent stretch in liveness.log means "not running", unlike the
    // transition-logged focus.log (S7). The lock-bail path returns before the
    // try and so doesn't beat here: that's correct, since it only bails when a
    // concurrent FRESH tick is mid-run and will beat for that minute (no gap).
    // logLiveness can't throw, so it never masks the tick's real error above.
    logLiveness(formatLiveness(eventsFetched, liveWinner));

    // Release the write-race lock for the next tick. Only reached on paths that
    // acquired it (the fresh-lock bail returns before the try), so this never
    // clears a lock another tick still holds.
    await clearWatcherLock();
  }
}

// Builds the heartbeat message (D.3.a). Records the events-fetched count and the
// currently-selected winner + its scheduled fire time, so a future miss is
// diagnosable, not just dated: a beat with winner set near the fire time but no
// matching fire line in focus.log = ran-but-dropped. `null` fetched means the
// tick errored or returned before the GCal fetch — rendered distinctly so an
// infra failure doesn't read as a healthy beat. See specs/phase-d3a-*.md.
function formatLiveness(
  eventsFetched: number | null,
  winner: PolledEvent | null,
): string {
  if (eventsFetched === null) {
    return "heartbeat — fetched=- (tick errored or returned before fetch)";
  }
  let winnerPart = "winner=none";
  if (winner) {
    const fires = winner.start
      ? `${String(winner.start.getHours()).padStart(2, "0")}:${String(winner.start.getMinutes()).padStart(2, "0")}`
      : "-";
    // Strip CR/LF + control chars from the title before interpolating. A
    // calendar title is attacker-influenceable (a shared/subscribed calendar);
    // a newline in it could forge an extra heartbeat line and poison the very
    // attribution liveness.log exists to provide for D.3.c. Sanitize here (the
    // liveness sink), not in logEvent — focus.log must stay byte-identical to
    // the un-sanitizing Python daemon for the dual-run diff. (/ce-review 2026-06-22)
    const safeTitle = winner.title.replace(/[\r\n]+/g, " ").replace(
      // eslint-disable-next-line no-control-regex
      /[\x00-\x1f]/g,
      "",
    );
    winnerPart = `winner="${safeTitle}" fires=${fires}`;
  }
  return `heartbeat — fetched=${eventsFetched} ${winnerPart}`;
}

// C4 fire path. Called on a tick where the selected winner's start has been
// reached. Mirrors the daemon's pipeline.fire + trigger.py byte-for-byte:
// mark-processed BEFORE the attempt (decision 2, so a crash or failed launch
// never re-fires), the modeled session window written at the same moment, and
// dryRun stopping at the dry label. Every action label matches the daemon's.
async function fireWinner(
  winner: PolledEvent,
  start: Date,
  now: Date,
  processed: state.ProcessedState,
  logState: LogState,
  dryRun: boolean,
  triggerMode: "auto" | "confirm",
): Promise<void> {
  // Skip-if-running guard (Phase A 2.5). No Raycast API exposes whether Focus is
  // running, so the guard tracks our own fire DECISIONS, not Focus processes
  // (the daemon never detected it either). If a session we modeled is still
  // inside its window, skip silently — transition-logged once, and NOT marked
  // processed, so the event retires naturally via the missed grace. Byte-
  // identical on both sides, which is what makes the Phase D diff line up.
  const active = await loadActiveSession();
  if (active && now.getTime() < Date.parse(active.endIso)) {
    logIfChanged(logState, "SKIPPED_FOCUS_RUNNING", winner);
    return;
  }

  // durationMin is non-null for a qualifier (filterEvents drops all-day/short);
  // `?? 0` mirrors the daemon's `(parse_duration_minutes(e) or 0)` defensiveness.
  const focusSeconds = focusDurationSeconds(winner.durationMin ?? 0);

  // Mark-before-attempt (decision 2). The state label is the SUCCESS label even
  // in dry-run and even if a live attempt then fails — exactly pipeline.fire,
  // which writes processed state before calling trigger_fn. Confirm marks
  // PROMPTED (dedup criterion = "we already asked"), auto marks TRIGGERED.
  const label =
    triggerMode === "confirm"
      ? dryRun
        ? "DRY_RUN_WOULD_PROMPT"
        : "PROMPTED"
      : dryRun
        ? "DRY_RUN"
        : "TRIGGERED";
  await state.markProcessed(processed, winner.id, label, start);

  // Model the session window [now, now + focusDuration] for the guard above.
  // Written in dry-run too: keeps the guard testable dry and matches what the
  // Phase D dry daemon must model.
  const endIso = new Date(now.getTime() + focusSeconds * 1000).toISOString();
  await saveActiveSession({ eventId: winner.id, endIso });

  // Dry-run: log the daemon's literal dry action and stop before any side
  // effect. The side effects (launchCommand / open) are the ONLY thing dryRun
  // suppresses — every decision above ran for real.
  if (dryRun) {
    logEvent(label, winner.id, winner.title, start, winner.durationMin);
    return;
  }

  if (triggerMode === "confirm") {
    // Confirm: launch the frozen modal, passing OUR LOG_PATH as logPath so the
    // modal appends its TRIGGERED / SKIPPED_USER_* lines to the watcher's own
    // focus.log (the single-sink move). arguments + context mirror trigger.py
    // handle_prompt exactly.
    try {
      await launchCommand({
        name: "confirm-focus",
        type: LaunchType.UserInitiated,
        arguments: {
          title: winner.title,
          duration: String(focusSeconds),
          categories: FOCUS_CATEGORIES,
        },
        context: {
          eventId: winner.id,
          logPath: LOG_PATH,
          timeoutSeconds: String(CONFIRM_TIMEOUT_SECONDS),
          startIso: start.toISOString(),
        },
      });
      logEvent("PROMPTED", winner.id, winner.title, start, winner.durationMin);
    } catch (e) {
      logEvent(
        "PROMPT_FAILED",
        winner.id,
        winner.title,
        start,
        winner.durationMin,
      );
      logSystem(`[watcher] Failed to launch confirm modal: ${e}`);
    }
  } else {
    // Auto: stop-then-start, mirroring trigger.py handle_trigger. complete is
    // best-effort (no-op when idle, must not block the start). Commas in
    // categories stay literal to match the daemon's quote(..., safe=',').
    const goal = encodeURIComponent(winner.title);
    const categories = FOCUS_CATEGORIES.split(",")
      .map(encodeURIComponent)
      .join(",");
    const startUrl = `raycast://focus/start?goal=${goal}&duration=${focusSeconds}&categories=${categories}`;
    try {
      try {
        await open("raycast://focus/complete");
      } catch (e) {
        logSystem(`[watcher] focus/complete failed (continuing): ${e}`);
      }
      await open(startUrl);
      logEvent("TRIGGERED", winner.id, winner.title, start, winner.durationMin);
    } catch (e) {
      logEvent(
        "TRIGGER_FAILED",
        winner.id,
        winner.title,
        start,
        winner.durationMin,
      );
      logSystem(`[watcher] Failed to launch Raycast Focus: ${e}`);
    }
  }
}

// Logs a structured event line only when its (guard, start) differs from the
// last line logged for that event id. Mutates logState in place.
//
// Keys on the PARSED start (toISOString, or "null" for all-day), mirroring the
// daemon's `start_dt.isoformat() if start_dt else None` in pipeline._log_if_changed.
// Keying on the raw GCal `startIso` string instead would risk a transition guard
// that fires or suppresses differently than the daemon when GCal returns a
// non-normalized offset, muddying the Phase D dual-run diff.
//
// `guardAction` overrides the action used in the guard key, defaulting to
// `action`. SCHEDULED passes the bare "SCHEDULED" while logging the full
// "SCHEDULED (+XmYYs)" line: the countdown changes every poll, so guarding on
// the displayed string would re-log every tick. Mirrors pipeline.schedule_next,
// which keys its SCHEDULED guard on ('SCHEDULED', start_iso), not the countdown.
function logIfChanged(
  logState: LogState,
  action: string,
  event: PolledEvent,
  guardAction?: string,
): void {
  const guard = guardAction ?? action;
  const key = `${guard}|${event.start ? event.start.toISOString() : "null"}`;
  if (logState[event.id] === key) return;
  logState[event.id] = key;
  logEvent(action, event.id, event.title, event.start, event.durationMin);
}

// Logs a system line at most once per (tag, message) across ticks, so a
// persistent condition doesn't spam the log every 60s.
async function logOnce(tag: string, message: string): Promise<void> {
  const sys: SysState = await loadSysState();
  if (sys[tag] === message) return;
  sys[tag] = message;
  await saveSysState(sys);
  logSystem(message);
}

async function clearSysFlags(): Promise<void> {
  const sys: SysState = await loadSysState();
  if (Object.keys(sys).length > 0) await saveSysState({});
}
