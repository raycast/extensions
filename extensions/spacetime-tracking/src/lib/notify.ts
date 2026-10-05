import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { rolloverStaleSession, getActiveSession, startSession } from "./storage";
import { tick } from "./tracker";

const AUTO_SESSION_DATE_KEY = "autoSessionDate";

function todayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sameDay(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

/**
 * When "Record a session automatically every day" is enabled: starts a new
 * session once per calendar day (the first time the menu-bar command runs that
 * day — i.e. when you next use/wake the computer), with no user action. A stale
 * session left running from a previous day is closed out (backdated to its last
 * activity); a session already started today is kept.
 */
export async function maybeAutoStartDailySession(): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.autoDailySession) return;

  const today = todayKey();
  if ((await LocalStorage.getItem<string>(AUTO_SESSION_DATE_KEY)) === today) return;

  // Roll over any session that crossed midnight first (this also starts today's replacement),
  // so the old one's stop time isn't stamped with "now" and we don't double-start below.
  await rolloverStaleSession();

  const active = await getActiveSession();
  if (active && sameDay(active.startedAt)) {
    // A session for today already exists (either pre-existing or just started by the rollover)
    // — just mark the day handled.
    await LocalStorage.setItem(AUTO_SESSION_DATE_KEY, today);
    return;
  }

  await startSession(); // no session running for today — start one
  await tick(); // establish the tracking baseline immediately
  await LocalStorage.setItem(AUTO_SESSION_DATE_KEY, today);
}
