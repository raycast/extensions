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

const DEFAULT_POMO_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;

// Whole minutes only ("25"); anything else ("", "0", "30.5", "30 min") falls back.
function parseMinutes(value: string | undefined, fallback: number): number {
  const trimmed = (value ?? "").trim();
  if (!/^\d+$/.test(trimmed)) return fallback;
  const minutes = Number(trimmed);
  return minutes >= 1 ? minutes : fallback;
}

export function getAppPreferences(): AppPreferences {
  // `Preferences` is generated from package.json by the Raycast CLI.
  const raw = getPreferenceValues<Preferences>();
  return {
    taskMode: raw.taskMode === "dailynote" ? "dailynote" : "manual",
    dailyNotePath: (raw.dailyNotePath ?? "").trim(),
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
