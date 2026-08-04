import { environment, getPreferenceValues, launchCommand, LaunchType, open } from "@raycast/api";
import { logEvent, logSystem, logLiveness, LOG_PATH } from "./lib/logger";
import { getAccessTokenSilently } from "./lib/oauth";
import { fetchUpcomingEvents, PolledEvent } from "./lib/gcal";
import { filterEvents, selectNextEvent, focusDurationSeconds } from "./lib/decision";
import { WATCHER_LOCK_STALE_SECONDS, FOCUS_CATEGORIES, CONFIRM_TIMEOUT_SECONDS } from "./lib/constants";
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

type Preferences = {
  triggerMode: "auto" | "confirm";
};

export default async function FocusWatcher() {
  const prefs = getPreferenceValues<Preferences>();
  const dryRun = false;
  const launchedInBackground = environment.launchType === LaunchType.Background;
  const tickStart = new Date();

  const existingLock = await loadWatcherLock();
  if (existingLock !== null) {
    const lockAgeSeconds = (tickStart.getTime() - existingLock.getTime()) / 1000;
    if (lockAgeSeconds < WATCHER_LOCK_STALE_SECONDS) {
      console.log(
        `[focus-watcher] tick skipped — watcher_lock held ${lockAgeSeconds.toFixed(1)}s ago (< ${WATCHER_LOCK_STALE_SECONDS}s)`,
      );
      return;
    }
  }
  await setWatcherLock(tickStart);

  let eventsFetched: number | null = null;
  let liveWinner: PolledEvent | null = null;

  try {
    const token = await getAccessTokenSilently();
    if (!token) {
      await logOnce("auth", "[watcher] No Google authorization yet. Waiting for onboarding; skipping poll.");
      return;
    }

    const calendarId = await getSelectedCalendarId();
    if (!calendarId) {
      await logOnce("calendar", "[watcher] No calendar selected. Waiting for onboarding; skipping poll.");
      return;
    }

    const events = await fetchUpcomingEvents(token, calendarId);
    eventsFetched = events.length; // for the liveness heartbeat (D.3.a)

    const lastCount = await loadLastCount();
    if (lastCount !== events.length) {
      logSystem(`[watcher] Poll complete — ${events.length} event(s) fetched from GCal.`);
      await saveLastCount(events.length);
    }

    const processed = await state.load();
    const logState = await loadLogState();
    const currentIds = new Set(events.map((e) => e.id));

    const now = new Date();

    const { qualifying, skipped } = filterEvents(events, processed, now);
    for (const { action, event } of skipped) {
      logIfChanged(logState, action, event);
    }

    const { winner, overlapped } = selectNextEvent(qualifying);
    liveWinner = winner;
    for (const event of overlapped) {
      logIfChanged(logState, "SKIPPED_OVERLAP", event);
    }

    if (winner && winner.start) {
      const delayMs = Math.max(0, winner.start.getTime() - now.getTime());
      const totalSeconds = Math.floor(delayMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const action = `SCHEDULED (+${minutes}m${String(seconds).padStart(2, "0")}s)`;
      logIfChanged(logState, action, winner, "SCHEDULED");
    }

    if (winner && winner.start && winner.start.getTime() <= now.getTime()) {
      await fireWinner(winner, winner.start, now, processed, logState, dryRun, prefs.triggerMode);
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
      msg.includes("invalid_grant") || msg.includes("Token refresh failed:") || msg.includes("failed: 401");
    if (needsReauth) {
      await logOnce("auth", "[watcher] Auth error: GCal token expired or revoked. Re-authorization required.");
    } else {
      // Transition-guarded by message so a persistent failure doesn't write an
      // identical line every 60s.
      await logOnce("error", `[watcher] Poll error (will retry next cycle): ${msg}`);
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
function formatLiveness(eventsFetched: number | null, winner: PolledEvent | null): string {
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
    triggerMode === "confirm" ? (dryRun ? "DRY_RUN_WOULD_PROMPT" : "PROMPTED") : dryRun ? "DRY_RUN" : "TRIGGERED";
  await state.markProcessed(processed, winner.id, label, start);

  // The skip-if-running window is written ONLY when a Focus session actually
  // starts — the auto branch below (after `open`) and, in confirm mode, the
  // modal on "Start" (confirm-focus.tsx). It is deliberately NOT written here:
  // writing it before the prompt was the confirm-mode bug where a Skip/timeout
  // left a stale window that silently suppressed later events. (Daemon parity no
  // longer applies — the daemon was retired at D.4, 2026-07-01.)

  // Dry-run: log the literal dry action and stop before any side effect. The
  // side effects (launchCommand / open) are the ONLY thing dryRun suppresses —
  // every decision above ran for real. (No session is modeled in dry-run, since
  // no Focus starts; the guard is exercised live, not dry.)
  if (dryRun) {
    logEvent(label, winner.id, winner.title, start, winner.durationMin);
    return;
  }

  if (triggerMode === "confirm") {
    // Confirm: launch the frozen modal, passing OUR LOG_PATH as logPath so the
    // modal appends its TRIGGERED / SKIPPED_USER_* lines to the watcher's own
    // focus.log (the single-sink move). The modal also writes the skip-if-
    // running window on "Start" (confirm-focus.tsx) — never here — so a
    // Skip/timeout leaves no stale window.
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
      logEvent("PROMPT_FAILED", winner.id, winner.title, start, winner.durationMin);
      logSystem(`[watcher] Failed to launch confirm modal: ${e}`);
    }
  } else {
    // Auto: stop-then-start, mirroring trigger.py handle_trigger. complete is
    // best-effort (no-op when idle, must not block the start). Commas in
    // categories stay literal to match the daemon's quote(..., safe=',').
    const goal = encodeURIComponent(winner.title);
    const categories = FOCUS_CATEGORIES.split(",").map(encodeURIComponent).join(",");
    const startUrl = `raycast://focus/start?goal=${goal}&duration=${focusSeconds}&categories=${categories}`;
    try {
      try {
        await open("raycast://focus/complete");
      } catch (e) {
        logSystem(`[watcher] focus/complete failed (continuing): ${e}`);
      }
      await open(startUrl);
      // A real Focus session just started: model its window [now, now+duration]
      // so the skip-if-running guard suppresses genuinely-overlapping events.
      const endIso = new Date(now.getTime() + focusSeconds * 1000).toISOString();
      await saveActiveSession({ eventId: winner.id, endIso });
      logEvent("TRIGGERED", winner.id, winner.title, start, winner.durationMin);
    } catch (e) {
      logEvent("TRIGGER_FAILED", winner.id, winner.title, start, winner.durationMin);
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
function logIfChanged(logState: LogState, action: string, event: PolledEvent, guardAction?: string): void {
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
