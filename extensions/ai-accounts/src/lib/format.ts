import { UsageWindow } from "./model";

// Pure formatting and window-validity helpers. Every time-dependent function takes nowMs.

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
/** Observation times further in the future than this are treated as invalid (clock skew). */
const MAX_FUTURE_SKEW_MS = 5 * MINUTE_MS;

/**
 * Readings older than this are shown as stale. Display only: decisions use SuggestionPrefs.decisionMaxAgeMinutes
 * or a backend-vouched UsageWindow.decisionMaxAgeMinutes, and neither ever extends this limit.
 */
export const DISPLAY_MAX_AGE_MINUTES = 15;

// RFC 3339 instant with an explicit offset. Naive local times and free text ("Oct 3") are
// rejected because Date.parse would silently guess a zone or a year.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;

/** Parse an absolute ISO time to epoch ms; null when missing or not an absolute ISO instant. */
export function parseIsoMs(iso: string | null | undefined): number | null {
  if (typeof iso !== "string" || !ISO_INSTANT.test(iso.trim())) return null;
  const ms = Date.parse(iso.trim());
  return Number.isFinite(ms) ? ms : null;
}

/** 100 - usedPct, clamped to 0..100. Unknown stays null. */
export function remainingPct(w: UsageWindow): number | null {
  const used = w.usedPct;
  if (typeof used !== "number" || !Number.isFinite(used)) return null;
  return Math.min(100, Math.max(0, 100 - used));
}

/** true when resetsAt is known and at or before now (the reading predates the reset). */
export function windowPastReset(w: UsageWindow, nowMs: number): boolean {
  const reset = parseIsoMs(w.resetsAt);
  return reset !== null && reset <= nowMs;
}

function ageMinutes(iso: string | null, nowMs: number): number | null {
  const observed = parseIsoMs(iso);
  if (observed === null) return null;
  const ageMs = nowMs - observed;
  if (ageMs < -MAX_FUTURE_SKEW_MS) return null;
  return Math.max(0, ageMs) / MINUTE_MS;
}

/** Minutes since the backend observed the window; small future skew counts as 0, larger skew as invalid (null). */
export function windowAgeMinutes(w: UsageWindow, nowMs: number): number | null {
  return ageMinutes(w.observedAt, nowMs);
}

/**
 * Remaining percent of a window when it can be shown as current: the account is ok and not last-known-good,
 * the reset has not passed, and the reading is at most maxAgeMinutes old. Otherwise null.
 */
export function currentWindowRemaining(
  account: { status: string; lastGood?: boolean },
  w: UsageWindow,
  nowMs: number,
  maxAgeMinutes: number = DISPLAY_MAX_AGE_MINUTES,
): number | null {
  if (account.status !== "ok" || account.lastGood || windowPastReset(w, nowMs)) return null;
  const age = windowAgeMinutes(w, nowMs);
  if (age === null || !(age <= maxAgeMinutes)) return null;
  return remainingPct(w);
}

/** "45m", "3h20m", "2d4h", "<1m"; "now" once passed; "—" when unknown. */
export function formatCountdown(iso: string | null, nowMs: number): string {
  const target = parseIsoMs(iso);
  if (target === null) return "—";
  const diff = target - nowMs;
  if (diff <= 0) return "now";
  if (diff < MINUTE_MS) return "<1m";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)}m`;
  if (diff < DAY_MS) {
    const h = Math.floor(diff / HOUR_MS);
    const m = Math.floor((diff % HOUR_MS) / MINUTE_MS);
    return m === 0 ? `${h}h` : `${h}h${m}m`;
  }
  const d = Math.floor(diff / DAY_MS);
  const h = Math.floor((diff % DAY_MS) / HOUR_MS);
  return h === 0 ? `${d}d` : `${d}d${h}h`;
}

/** "just now", "4m ago", "2h ago", "3d ago"; "—" when unknown or implausibly in the future. */
export function formatAge(iso: string | null, nowMs: number): string {
  const minutes = ageMinutes(iso, nowMs);
  if (minutes === null) return "—";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  if (minutes < 48 * 60) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / (24 * 60))}d ago`;
}

/** Integer percent ("0%", "57%", "100%"); "?" when unknown. */
export function formatPct(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "?";
  const rounded = Math.round(value);
  return `${rounded === 0 ? 0 : rounded}%`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday and 24h time in the local time zone, e.g. "Tue 18:09"; "—" when unknown. */
export function formatLocalTime(iso: string | null): string {
  const ms = parseIsoMs(iso);
  if (ms === null) return "—";
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${WEEKDAYS[d.getDay()]} ${hh}:${mm}`;
}
