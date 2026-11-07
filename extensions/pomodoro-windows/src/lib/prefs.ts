import { getPreferenceValues } from "@raycast/api";

interface RawPrefs {
  dailyGoal?: string;
  autoStartBreaks?: boolean;
  autoStartFocus?: boolean;
  enableToast?: boolean;
  enableSound?: boolean;
  sound?: string;
  customSound?: string;
}

/** Extension-wide settings. Interval lengths live in focus presets, not here. */
export interface Prefs {
  dailyGoal: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  enableToast: boolean;
  enableSound: boolean;
  sound: string;
  customSound?: string;
}

function num(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseFloat((value ?? "").trim());
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getPrefs(): Prefs {
  const raw = getPreferenceValues<RawPrefs>();
  return {
    dailyGoal: Math.round(num(raw.dailyGoal, 8, 1, 50)),
    autoStartBreaks: raw.autoStartBreaks ?? true,
    autoStartFocus: raw.autoStartFocus ?? false,
    enableToast: raw.enableToast ?? true,
    enableSound: raw.enableSound ?? true,
    sound: raw.sound || "Alarm01.wav",
    customSound: raw.customSound?.trim() || undefined,
  };
}
