import { getPreferenceValues, LocalStorage } from "@raycast/api";

const GLASSES_KEY = "glasses";
const GLASSES_DATE_KEY = "glassesDate";
const FOLLOW_KEY = "followedMatch";
const ALERTED_KEY = "alertedBreak";

type RawPreferences = {
  hydrationGoal: string;
  dayStart: string;
  dayEnd: string;
  breakDuration: string;
  playCheer: boolean;
  alertOnBreak: boolean;
};

/** A real match the user chose to follow instead of the simulated clock. */
export type FollowedMatch = {
  id: string;
  league: string;
  label: string;
};

/**
 * FIFA World Cup 2026 hydration-break marks: the 22-minute mark of each half,
 * i.e. 22' in the first half and 45'+22' = 67' in the second. Three minutes,
 * whistle-to-whistle, mandatory in every match.
 * Source: https://inside.fifa.com/organisation/news/hydration-breaks-world-cup-2026-player-welfare
 */
export const LIVE_BREAK_MARKS = [22, 67] as const;

export type LiveBreakInfo = {
  onBreak: boolean;
  breakMinutesLeft: number;
  minutesToNextBreak: number | null;
  /** The break mark the match is currently inside, or null. */
  activeBreakStart: number | null;
};

/** Evaluate a real (non-looping) match minute against the standard break marks. */
export function liveBreakInfo(minute: number, breakDuration: number): LiveBreakInfo {
  for (const start of LIVE_BREAK_MARKS) {
    if (minute >= start && minute < start + breakDuration) {
      return {
        onBreak: true,
        breakMinutesLeft: start + breakDuration - minute,
        minutesToNextBreak: null,
        activeBreakStart: start,
      };
    }
  }
  const next = LIVE_BREAK_MARKS.find((start) => start > minute);
  return {
    onBreak: false,
    breakMinutesLeft: 0,
    minutesToNextBreak: next ? next - minute : null,
    activeBreakStart: null,
  };
}

export type Settings = {
  hydrationGoal: number;
  /** Active-hours window, minutes from local midnight. */
  dayStartMin: number;
  dayEndMin: number;
  breakDuration: number;
  playCheer: boolean;
  alertOnBreak: boolean;
};

function parseTime(value: string, fallback: number): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value ?? "").trim());
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return fallback;
  return hours * 60 + minutes;
}

export function getSettings(): Settings {
  const prefs = getPreferenceValues<RawPreferences>();
  const hydrationGoal = clamp(Number(prefs.hydrationGoal) || 8, 1, 30);
  const breakDuration = clamp(Number(prefs.breakDuration) || 3, 1, 30);
  const dayStartMin = parseTime(prefs.dayStart, 9 * 60);
  // Keep the window valid even if end <= start.
  const dayEndMin = Math.max(dayStartMin + 60, parseTime(prefs.dayEnd, 21 * 60));
  return {
    hydrationGoal,
    dayStartMin,
    dayEndMin,
    breakDuration,
    playCheer: prefs.playCheer ?? true,
    alertOnBreak: prefs.alertOnBreak ?? true,
  };
}

export type ScheduleState = {
  /** Total scheduled breaks today (= the daily goal). */
  totalBreaks: number;
  /** How many scheduled break times have already passed today. */
  breaksElapsed: number;
  onBreak: boolean;
  /** Whole minutes left in the active break window (when onBreak). */
  breakMinutesLeft: number;
  /** 1-based number of the active break (when onBreak). */
  currentBreakNumber: number | null;
  /** Whole minutes until the next break (when one remains today). */
  minutesToNextBreak: number | null;
  /** Local clock time "HH:MM" of the next break, for display. */
  nextBreakAt: string | null;
  /** Before the day's first break. */
  beforeFirst: boolean;
  /** Past the day's last break. */
  allDone: boolean;
};

const fmtClock = (minutes: number): string => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/**
 * Default mode: spread `hydrationGoal` breaks evenly across the active-hours
 * window, each centred in its slice. One break = one glass, so completing every
 * break exactly hits the daily goal.
 */
export function computeSchedule(now: number, settings: Settings): ScheduleState {
  const { hydrationGoal: total, breakDuration, dayStartMin, dayEndMin } = settings;
  const d = new Date(now);
  const nowMin = d.getHours() * 60 + d.getMinutes();
  const segment = (dayEndMin - dayStartMin) / total;
  const breakTimes = Array.from({ length: total }, (_, i) => dayStartMin + (i + 0.5) * segment);

  let onBreak = false;
  let breakMinutesLeft = 0;
  let currentBreakNumber: number | null = null;
  breakTimes.forEach((t, i) => {
    if (!onBreak && nowMin >= t && nowMin < t + breakDuration) {
      onBreak = true;
      breakMinutesLeft = Math.max(1, Math.ceil(t + breakDuration - nowMin));
      currentBreakNumber = i + 1;
    }
  });

  const breaksElapsed = breakTimes.filter((t) => nowMin >= t).length;
  const nextIdx = breakTimes.findIndex((t) => t > nowMin);
  const minutesToNextBreak = nextIdx === -1 ? null : Math.max(1, Math.ceil(breakTimes[nextIdx] - nowMin));

  return {
    totalBreaks: total,
    breaksElapsed,
    onBreak,
    breakMinutesLeft,
    currentBreakNumber,
    minutesToNextBreak,
    nextBreakAt: nextIdx === -1 ? null : fmtClock(breakTimes[nextIdx]),
    beforeFirst: nowMin < breakTimes[0],
    allDone: nextIdx === -1 && !onBreak,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const dayStamp = (now: number): string => new Date(now).toISOString().slice(0, 10);
const todayKey = dayStamp;

export async function getGlasses(now: number): Promise<number> {
  const date = await LocalStorage.getItem<string>(GLASSES_DATE_KEY);
  if (date !== todayKey(now)) return 0;
  return (await LocalStorage.getItem<number>(GLASSES_KEY)) ?? 0;
}

export async function logGlass(now: number): Promise<number> {
  const current = await getGlasses(now);
  const next = current + 1;
  await LocalStorage.setItem(GLASSES_KEY, next);
  await LocalStorage.setItem(GLASSES_DATE_KEY, todayKey(now));
  return next;
}

/**
 * True on the glass that lands exactly on the goal. Counts increment by one and
 * reset daily, so this is naturally once per day — no stored flag to get stuck.
 */
export function reachedGoal(glasses: number, goal: number): boolean {
  return glasses === goal;
}

export async function getFollowedMatch(): Promise<FollowedMatch | null> {
  const raw = await LocalStorage.getItem<string>(FOLLOW_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FollowedMatch;
  } catch {
    return null;
  }
}

export async function followMatch(match: FollowedMatch): Promise<void> {
  await LocalStorage.setItem(FOLLOW_KEY, JSON.stringify(match));
}

export async function unfollowMatch(): Promise<void> {
  await LocalStorage.removeItem(FOLLOW_KEY);
}

/** Reset only today's glass count, keeping any followed match and settings. */
export async function resetGlasses(): Promise<void> {
  await LocalStorage.removeItem(GLASSES_KEY);
  await LocalStorage.removeItem(GLASSES_DATE_KEY);
}

/** Wipe everything: glasses, followed match, and alert markers. */
export async function resetAll(): Promise<void> {
  await LocalStorage.clear();
}

/**
 * Returns true at most once per distinct break. `key` uniquely identifies the
 * current break (match + mark + loop) so the 1-minute refresh alerts once, not
 * every minute of the 3-minute window.
 */
export async function shouldAlertBreak(key: string): Promise<boolean> {
  const last = await LocalStorage.getItem<string>(ALERTED_KEY);
  if (last === key) return false;
  await LocalStorage.setItem(ALERTED_KEY, key);
  return true;
}
