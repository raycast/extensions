import { getPreferenceValues } from "@raycast/api";
import { finalizeStaleDailySession, getActiveSession, upsertSession } from "./storage";
import { getCurrentSpace, mainDisplay } from "./native";
import { getIdleSeconds, isDisplayKeptAwake } from "./idle";
import { spaceKey, SpaceInfo } from "./format";
import { Preferences, Session, TrackerStatus } from "./types";

/**
 * Guard against counting huge gaps (e.g. the machine slept while inactivity
 * detection was disabled, or the menu bar command was disabled for a while).
 * Any single interval larger than this is ignored.
 */
const MAX_TICK_DELTA_SECONDS = 60 * 60; // 1 hour

export interface TickResult {
  status: TrackerStatus;
  sessionName?: string;
  currentSpace?: SpaceInfo;
  error?: string;
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
export async function tick(): Promise<TickResult> {
  const prefs = getPreferenceValues<Preferences>();
  // Close out a session left over from a previous day before attributing any time, so the new
  // day's time can never leak into it (only active when Automatic Daily Session is on).
  await finalizeStaleDailySession();
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
    await upsertSession(session);
    return {
      status: "error",
      sessionName: session.name,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const now = Date.now();

  // Only track time spent on the main display — ignore spaces on other displays.
  if (current.display !== mainDisplay()) {
    session.lastTick = undefined; // break the chain so off-display time isn't counted
    session.lastSpaceKey = undefined;
    await upsertSession(session);
    return { status: "tracking", sessionName: session.name, currentSpace: current };
  }

  // Inactivity handling.
  if (prefs.inactivityEnabled) {
    const thresholdSeconds = Math.max(1, parseFloat(prefs.inactivityMinutes) || 10) * 60;
    // Don't auto-pause if media/presentation is keeping the display awake (e.g. watching a video):
    // there's no keyboard/mouse input, but the user is clearly still present. The pmset check only
    // runs once we've actually crossed the idle threshold, so it never adds per-tick overhead.
    if (getIdleSeconds() >= thresholdSeconds && !(prefs.keepTrackingWhileMedia && isDisplayKeptAwake())) {
      session.autoPaused = true;
      session.lastTick = undefined; // break the chain so the idle stretch isn't counted
      session.lastSpaceKey = spaceKey(current);
      ensureRecord(session, spaceKey(current), current);
      await upsertSession(session);
      return { status: "auto-paused", sessionName: session.name, currentSpace: current };
    }
  }
  session.autoPaused = false;

  const liveKey = spaceKey(current);
  ensureRecord(session, liveKey, current);

  // Attribute the interval since the last tick to the space we were in then.
  const from = session.lastTick ?? null;
  const key = session.lastSpaceKey ?? liveKey;
  if (from != null) {
    const delta = (now - from) / 1000;
    if (delta > 0 && delta <= MAX_TICK_DELTA_SECONDS) {
      const rec = session.spaces[key];
      if (rec) rec.seconds += delta;
    }
  }

  session.lastTick = now;
  session.lastActiveAt = now; // last moment we recorded real activity (used to backdate stop time)
  session.lastSpaceKey = liveKey;
  await upsertSession(session);

  return { status: "tracking", sessionName: session.name, currentSpace: current };
}
