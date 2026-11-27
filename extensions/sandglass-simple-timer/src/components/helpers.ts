/** Pure helpers and preset definitions for the Sandglass UI. Must not import @raycast/api (unit tested with Node). */
import { formatShort } from "../lib/format.ts";

const MINUTE = 60_000;
const HOUR = 3_600_000;

export interface Preset {
  minutes: number;
  /** Shown as the item subtitle. */
  subtitle: string;
  /** Label applied to the timer, if any. */
  label?: string;
}

export const PRESETS: Preset[] = [
  { minutes: 1, subtitle: "Quick check" },
  { minutes: 5, subtitle: "Short break", label: "Short break" },
  { minutes: 10, subtitle: "" },
  { minutes: 15, subtitle: "" },
  { minutes: 25, subtitle: "Focus", label: "Focus" },
  { minutes: 45, subtitle: "Deep work", label: "Deep work" },
  { minutes: 60, subtitle: "One hour" },
];

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** "1 Minute", "25 Minutes", "2 Hours", otherwise "1 h 30 min". */
export function plainDurationTitle(ms: number): string {
  if (ms % HOUR === 0) return plural(ms / HOUR, "Hour");
  if (ms % MINUTE === 0 && ms < HOUR) return plural(ms / MINUTE, "Minute");
  return formatShort(ms);
}

/** "12-Minute", "1-Hour", "90-Second" for single units, otherwise "1 h 30 min". Used as "Start … Timer". */
export function durationTitle(ms: number): string {
  if (ms % HOUR === 0) return `${ms / HOUR}-Hour`;
  if (ms % MINUTE === 0 && ms < HOUR) return `${ms / MINUTE}-Minute`;
  if (ms % 1000 === 0 && ms < MINUTE) return `${ms / 1000}-Second`;
  return formatShort(ms);
}

/** Fraction of an hour for the mini dial icon, clamped to 0..1. */
export const hourFraction = (ms: number): number => Math.min(1, Math.max(0, ms / HOUR));
