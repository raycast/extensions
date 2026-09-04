import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_DAILY_NOTE_FORMAT } from "./parser";

export interface AppPreferences {
  taskMode: "manual" | "dailynote";
  dailyNotePath: string;
  dailyNoteFormat: string;
  pomoDuration: number; // minutes
  breakDuration: number; // minutes
  timetableHeader: string;
  logSectionHeader: string;
  pomodoroLogHeader: string;
  breakKeywords: string[];
  quickStartTask: string;
  enableLogging: boolean;
}

// Raycast returns every textfield as a string and taskMode as plain string.
type RawPreferences = Omit<
  AppPreferences,
  "taskMode" | "breakKeywords" | "pomoDuration" | "breakDuration"
> & {
  taskMode: string;
  breakKeywords: string;
  pomoDuration: string;
  breakDuration: string;
};

const DEFAULT_POMO_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

// Whole minutes only; anything else (empty, "0", "-5", "abc") falls back.
function parseMinutes(value: string | undefined, fallback: number): number {
  const minutes = parseInt((value ?? "").trim(), 10);
  return Number.isInteger(minutes) && minutes >= 1 ? minutes : fallback;
}

export function getAppPreferences(): AppPreferences {
  const raw = getPreferenceValues<RawPreferences>();
  return {
    taskMode: (raw.taskMode as "manual" | "dailynote") || "manual",
    dailyNotePath: raw.dailyNotePath || "",
    dailyNoteFormat: raw.dailyNoteFormat || DEFAULT_DAILY_NOTE_FORMAT,
    pomoDuration: parseMinutes(raw.pomoDuration, DEFAULT_POMO_MINUTES),
    breakDuration: parseMinutes(raw.breakDuration, DEFAULT_BREAK_MINUTES),
    timetableHeader: raw.timetableHeader || "# Timetable",
    logSectionHeader: raw.logSectionHeader || "## Work Log",
    pomodoroLogHeader: raw.pomodoroLogHeader || "### Pomodoro Log",
    breakKeywords: (raw.breakKeywords || "Break,Lunch")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0),
    quickStartTask: raw.quickStartTask || "Morning Routine",
    enableLogging: raw.enableLogging !== false,
  };
}
