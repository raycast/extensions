import { Options } from "./types";

export interface RawPreferences {
  icsUrl: string;
  weeks?: string;
  startHour?: string;
  endHour?: string;
  minSlotMinutes?: string;
  tentativeIsBusy?: boolean;
  includeWeekend?: boolean;
  language?: string;
}

export function toOptions(p: RawPreferences): Options {
  const startHour = clampInt(p.startHour, 8, 0, 22);
  const endHour = Math.max(startHour + 1, clampInt(p.endHour, 18, 1, 24));
  return {
    weeks: clampInt(p.weeks, 2, 1, 4),
    startHour,
    endHour,
    minSlotMinutes: clampInt(p.minSlotMinutes, 30, 5, 240),
    tentativeIsBusy: p.tentativeIsBusy ?? true,
    includeWeekend: p.includeWeekend ?? false,
    language: p.language === "de" ? "de" : "en",
  };
}

function clampInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Calendar apps often show the link as webcal://, but it can only be fetched via https. */
export function normalizeUrl(raw: string): string {
  const url = raw.trim().replace(/^webcals?:\/\//i, "https://");
  if (!/^https:\/\//i.test(url)) throw new Error("The ICS link must start with https:// or webcal://.");
  return url;
}
