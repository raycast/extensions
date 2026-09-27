import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Session, StatusState } from "./types";
import { normalizeWorkDays } from "./utils";

const SESSIONS_KEY = "clocky.sessions";
const VACATION_KEY = "clocky.vacationDays";
const STATUS_STATE_KEY = "clocky.status.state";
const STATUS_LAST_SEEN_KEY = "clocky.status.lastSeenIso";

type TargetConfig = {
  targetHours: number;
  workDaysPerWeek: number;
};

type ForgotThresholds = {
  forgotClockOutMs: number;
  forgotClockInMs: number;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export async function getSessions(): Promise<Session[]> {
  const raw = await LocalStorage.getItem<string>(SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: Session[]) {
  await LocalStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function getTargetConfig(): Promise<TargetConfig> {
  // Preference name: targetWeeklyHours (number, weekly). We convert to daily target hours.
  try {
    const prefs = getPreferenceValues<Preferences>();
    const prefDays = toNumber(prefs?.workDaysPerWeek);
    const workDaysPerWeek = normalizeWorkDays(prefDays && prefDays > 0 ? prefDays : 5);
    const weeklyHours = toNumber(prefs?.targetWeeklyHours);
    if (weeklyHours && weeklyHours > 0) {
      return { targetHours: weeklyHours / workDaysPerWeek, workDaysPerWeek };
    }
    return { targetHours: 8, workDaysPerWeek };
  } catch {
    return { targetHours: 8, workDaysPerWeek: 5 };
  }
}

export async function getVacationDays(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(VACATION_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function saveVacationDays(days: string[]) {
  await LocalStorage.setItem(VACATION_KEY, JSON.stringify(days));
}

export async function toggleVacationDay(dayKey: string): Promise<string[]> {
  const days = await getVacationDays();
  const next = new Set(days);
  if (next.has(dayKey)) {
    next.delete(dayKey);
  } else {
    next.add(dayKey);
  }
  const list = Array.from(next).sort();
  await saveVacationDays(list);
  return list;
}

const DEFAULT_FORGOT_CLOCK_OUT_MINUTES = 15;
const DEFAULT_FORGOT_CLOCK_IN_MINUTES = 30;

function minutesToMs(value: unknown, defaultMinutes: number): number {
  const minutes = toNumber(value);
  return (minutes && minutes > 0 ? minutes : defaultMinutes) * 60 * 1000;
}

export async function getForgotThresholds(): Promise<ForgotThresholds> {
  try {
    const prefs = getPreferenceValues<Preferences>();
    return {
      forgotClockOutMs: minutesToMs(prefs?.forgotClockOutThresholdMinutes, DEFAULT_FORGOT_CLOCK_OUT_MINUTES),
      forgotClockInMs: minutesToMs(prefs?.forgotClockInThresholdMinutes, DEFAULT_FORGOT_CLOCK_IN_MINUTES),
    };
  } catch {
    return {
      forgotClockOutMs: DEFAULT_FORGOT_CLOCK_OUT_MINUTES * 60 * 1000,
      forgotClockInMs: DEFAULT_FORGOT_CLOCK_IN_MINUTES * 60 * 1000,
    };
  }
}

export async function getStatusState(): Promise<StatusState> {
  const raw = await LocalStorage.getItem<string>(STATUS_STATE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StatusState;
  } catch {
    return {};
  }
}

export async function saveStatusState(state: StatusState) {
  await LocalStorage.setItem(STATUS_STATE_KEY, JSON.stringify(state));
}

export async function getStatusLastSeenIso(): Promise<string | undefined> {
  return (await LocalStorage.getItem<string>(STATUS_LAST_SEEN_KEY)) ?? undefined;
}

export async function saveStatusLastSeenIso(iso: string) {
  await LocalStorage.setItem(STATUS_LAST_SEEN_KEY, iso);
}
