import { environment, getPreferenceValues } from "@raycast/api";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type FocusLevel = "High" | "Medium" | "Low";

export type PomodoroConfig = {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  workVolume: number;
  breakVolume: number;
  alarmVolume: number;
  workSoundFile?: string;
  breakSoundFile?: string;
  alarmSoundFile?: string;
};

type PomodoroConfigOverrides = Partial<
  Pick<PomodoroConfig, "workMinutes" | "shortBreakMinutes" | "longBreakMinutes" | "longBreakEvery">
>;

const POMODORO_CONFIG_OVERRIDES_FILE = join(environment.supportPath, "pomodoro-config-overrides.json");
const WORK_SESSION_TYPES_FILE = join(environment.supportPath, "work-session-types.json");
const DEFAULT_WORK_SESSION_TYPES = ["Main Work", "Writing", "Reading", "Admin"] as const;

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseVolume(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.min(parsed, 100));
}

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function getPomodoroConfig(): PomodoroConfig {
  const preferences = getPreferences();
  const overrides = loadPomodoroConfigOverrides();

  return {
    workMinutes: overrides.workMinutes
      ? parsePositiveInteger(String(overrides.workMinutes), 25)
      : parsePositiveInteger(preferences.workMinutes, 25),
    shortBreakMinutes: overrides.shortBreakMinutes
      ? parsePositiveInteger(String(overrides.shortBreakMinutes), 5)
      : parsePositiveInteger(preferences.shortBreakMinutes, 5),
    longBreakMinutes: overrides.longBreakMinutes
      ? parsePositiveInteger(String(overrides.longBreakMinutes), 15)
      : parsePositiveInteger(preferences.longBreakMinutes, 15),
    longBreakEvery: overrides.longBreakEvery
      ? parsePositiveInteger(String(overrides.longBreakEvery), 4)
      : parsePositiveInteger(preferences.longBreakEvery, 4),
    workVolume: parseVolume(preferences.workVolume, 60),
    breakVolume: parseVolume(preferences.breakVolume, 50),
    alarmVolume: parseVolume(preferences.alarmVolume, 80),
    workSoundFile: preferences.workSoundFile || undefined,
    breakSoundFile: preferences.breakSoundFile || undefined,
    alarmSoundFile: preferences.alarmSoundFile || undefined,
  };
}

function loadPomodoroConfigOverrides(): PomodoroConfigOverrides {
  if (!existsSync(POMODORO_CONFIG_OVERRIDES_FILE)) {
    return {};
  }

  try {
    const raw = readFileSync(POMODORO_CONFIG_OVERRIDES_FILE, "utf8");
    return JSON.parse(raw) as PomodoroConfigOverrides;
  } catch {
    return {};
  }
}

export async function savePomodoroConfigOverrides(overrides: PomodoroConfigOverrides): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(POMODORO_CONFIG_OVERRIDES_FILE, JSON.stringify(overrides, null, 2), "utf8");
}

export function getWorkSessionTypes(): string[] {
  if (!existsSync(WORK_SESSION_TYPES_FILE)) {
    return [...DEFAULT_WORK_SESSION_TYPES];
  }

  try {
    const raw = readFileSync(WORK_SESSION_TYPES_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_WORK_SESSION_TYPES];
    }

    const normalized = parsed
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value, index, array) => value !== "" && array.indexOf(value) === index);

    return normalized.length > 0 ? normalized : [...DEFAULT_WORK_SESSION_TYPES];
  } catch {
    return [...DEFAULT_WORK_SESSION_TYPES];
  }
}

export async function saveWorkSessionTypes(types: string[]): Promise<void> {
  const normalized = types
    .map((value) => value.trim())
    .filter((value, index, array) => value !== "" && array.indexOf(value) === index);

  if (normalized.length === 0) {
    throw new Error("At least one work session type is required.");
  }

  await mkdir(environment.supportPath, { recursive: true });
  await writeFile(WORK_SESSION_TYPES_FILE, JSON.stringify(normalized, null, 2), "utf8");
}

export function getNotionSettings(): {
  notionToken?: string;
  notionDatabaseId?: string;
} {
  const preferences = getPreferences();

  return {
    notionToken: preferences.notionToken?.trim() || undefined,
    notionDatabaseId: preferences.notionDatabaseId?.trim() || undefined,
  };
}
