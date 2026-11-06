import { resolveWeekNumbering, WeekNumbering, WeekStartsOn } from "./calendar";
import { languageConfig, LanguageConfig } from "./locales";

const DEFAULT_FORMAT = "yyyy-MM-dd";

export interface DateFormatSlot {
  /** 1-based number shown to the user and used as the switching key. */
  number: number;
  pattern: string;
}

export interface Settings {
  /** Non-empty formats only; always contains at least one entry. */
  formats: DateFormatSlot[];
  /** Index into `formats` selected when the calendar opens. */
  initialFormatIndex: number;
  language: LanguageConfig;
  weekStartsOn: WeekStartsOn;
  /** Undefined when week numbers are hidden. */
  weekNumbering?: WeekNumbering;
}

/** Interprets raw preference values. Free of Raycast APIs so it can be unit tested. */
export function parseSettings(preferences: Preferences.InsertDate): Settings {
  // Adding another format only needs a new preference and an entry here.
  const patterns = [preferences.format1, preferences.format2];
  const formats = patterns
    .map((pattern, index) => ({ number: index + 1, pattern: pattern?.trim() ?? "" }))
    .filter((slot) => slot.pattern !== "");
  if (formats.length === 0 || formats[0].number !== 1) {
    // Format 1 falls back to the default when left empty.
    formats.unshift({ number: 1, pattern: DEFAULT_FORMAT });
  }

  const initial = formats.findIndex((slot) => String(slot.number) === preferences.defaultFormat);
  const weekStartsOn: WeekStartsOn = preferences.weekStart === "1" ? 1 : 0;

  return {
    formats,
    initialFormatIndex: initial === -1 ? 0 : initial,
    language: languageConfig(preferences.language),
    weekStartsOn,
    weekNumbering:
      preferences.weekNumbers === "off" ? undefined : resolveWeekNumbering(preferences.weekNumbers, weekStartsOn),
  };
}
