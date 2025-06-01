import { Color, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences.Menubar>();

export const FASTING_DURATION_MS = parseInt(preferences.fastingHours || "16") * 60 * 60 * 1000;
export const EATING_DURATION_MS = parseInt(preferences.eatingHours || "8") * 60 * 60 * 1000;

export const TIME_FORMAT_OPTIONS = {
  hour: "2-digit" as const,
  minute: "2-digit" as const,
} as const;

export const DATE_FORMAT_OPTIONS = {
  year: "numeric" as const,
  month: "2-digit" as const,
  day: "2-digit" as const,
  hour: "2-digit" as const,
  minute: "2-digit" as const,
} as const;

export const DEFAULT_KEY = "if";

export const EATING_COLOR = Color.Green;
export const FASTING_COLOR = Color.Orange;
