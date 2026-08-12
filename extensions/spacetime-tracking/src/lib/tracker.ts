import { getPreferenceValues } from "@raycast/api";
import { rolloverStaleSession, getActiveSession, upsertSession } from "./storage";
import { getCurrentSpace, mainDisplay } from "./native";
import { getIdleSeconds, isDisplayKeptAwake } from "./idle";
import { spaceKey, SpaceInfo } from "./format";
import { Session, TrackerStatus } from "./types";
import { MAX_TICK_DELTA_SECONDS } from "./consts";

export interface TickResult {
  status: TrackerStatus;
  sessionName?: string;
  currentSpace?: SpaceInfo;
  error?: string;
}

export interface TickOptions {
  /**
   * Persist the result (default). Pass `false` for a read-only observer such as
   * the Sessions view: it polls every couple of seconds, and writing from there
   * competes with the menu bar for the delta clock — its `lastTick` resets threw
   * away time the tracker still had pending, stalling the session total.
   */
  commit?: boolean;
}

function ensureRecord(session: Session, key: string, info: SpaceInfo): void {
  const rec = session.spaces[key];
  if (rec) {
    rec.index = info.index;
    rec.display = info.display;
    rec.label = info.label;
    rec.id = info.id;
  } else {
    session.spaces[key] = {
      key,
      id: info.id,
      label: info.label,
      index: info.index,
      display: info.display,
      seconds: 0,
    };
  }
}

/**
 * One tracking tick. Called on every menu-bar refresh interval (and before any
 * session mutation). Attributes the time elapsed since the last tick to the
 * space the user was in, then records the current space for the next interval.
 */
export async function tick(options: TickOptions = {}): Promise<TickResult> {
  const prefs = getPreferenceValues<Preferences>();
  const commit = options.commit ?? true;
  const save = async (session: Session) => {
    if (commit) await upsertSession(session);
  };
  // Close out any session that has crossed midnight before attributing time, so a session can
  // never span two calendar days and the new day's time can't leak into the old one. Always runs.
  if (commit) await rolloverStaleSession();
  const session = await getActiveSession();

  if (!session) {
    return { status: "idle" };
  }
  if (session.paused) {
    return { status: "paused", sessionName: session.name };
  }

  let current: SpaceInfo;
  try {
    current = getCurrentSpace();
  } catch (err) {
    session.lastTick = undefined; // don't count time we can't attribute
    await save(session);
    return {
      status: "error",
      sessionName: session.name,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const now = Date.now();

  // Only track time spent on the main display — ignore spaces on other displays. Reported as its
  // own status so the UI can say "not tracking" instead of just showing a total that never moves.
  if (current.display !== mainDisplay()) {
    session.lastTick = undefined; // break the chain so off-display time isn't counted
    session.lastSpaceKey = undefined;
    await save(session);
    return { status: "other-display", sessionName: session.name, currentSpace: current };
  }

  // Inactivity handling.
  if (prefs.inactivityEnabled) {
    // Only fall back to 10 for missing/non-numeric input — a deliberate 0 is kept and floored to 1
    // minute by Math.max (using `|| 10` would wrongly treat 0 as missing; `?? 10` wouldn't catch NaN).
    const minutes = parseFloat(prefs.inactivityMinutes);
    const thresholdSeconds = Math.max(1, Number.isFinite(minutes) ? minutes : 10) * 60;
    // Don't auto-pause if media/presentation is keeping the display awake (e.g. watching a video):
    // there's no keyboard/mouse input, but the user is clearly still present. The pmset check only
    // runs once we've actually crossed the idle threshold, so it never adds per-tick overhead.
    if (getIdleSeconds() >= thresholdSeconds && !(prefs.keepTrackingWhileMedia && isDisplayKeptAwake())) {
      session.autoPaused = true;
      session.lastTick = undefined; // break the chain so the idle stretch isn't counted
      session.lastSpaceKey = spaceKey(current);
      ensureRecord(session, spaceKey(current), current);
      await save(session);
      return { status: "auto-paused", sessionName: session.name, currentSpace: current };
    }
  }
  session.autoPaused = false;

  const liveKey = spaceKey(current);
  ensureRecord(session, liveKey, current);

  // Attribute the interval since the last tick to the space we were in then.
  const rawFrom = session.lastTick ?? null;
  const key = session.lastSpaceKey ?? liveKey;
  if (rawFrom != null) {
    // Never credit time before the session began — matters for a replacement session whose
    // startedAt is floored to 00:01 while its baseline tick fired at 00:00 (the midnight gap).
    const from = Math.max(rawFrom, session.startedAt);
    const delta = (now - from) / 1000;
    if (delta > 0 && delta <= MAX_TICK_DELTA_SECONDS) {
      const rec = session.spaces[key];
      if (rec) rec.seconds += delta;
    }
  }

  session.lastTick = now;
  session.lastActiveAt = now; // last moment we recorded real activity (used to backdate stop time)
  session.lastSpaceKey = liveKey;
  await save(session);

  return { status: "tracking", sessionName: session.name, currentSpace: current };
}

/**
 * Seconds tracked since the last committed tick — time the tracker will credit
 * on its next run but that isn't in `session.spaces` yet. Lets a read-only view
 * show a live-looking total between the menu bar's ticks instead of jumping in
 * whole intervals. Zero unless we're actually tracking.
 */
export function pendingSeconds(session: Session, status: TrackerStatus, now = Date.now()): number {
  if (!session.isActive || status !== "tracking" || session.lastTick == null) return 0;
  const delta = (now - Math.max(session.lastTick, session.startedAt)) / 1000;
  return delta > 0 && delta <= MAX_TICK_DELTA_SECONDS ? delta : 0;
}
