import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import { Preferences } from "./types";

/**
 * Detect if macOS is set to 24-hour time
 */
function isSystem24Hour(): boolean {
  try {
    const result = execSync(
      "defaults read NSGlobalDomain AppleICUForce24HourTime",
      { encoding: "utf-8" },
    ).trim();
    return result === "1";
  } catch {
    // If the key doesn't exist, macOS defaults to locale-based (typically 12hr in en_US)
    return false;
  }
}

/**
 * Clean a time string from API (strip timezone like " (PKT)")
 */
export function cleanTime(timeStr: string): string {
  return timeStr.replace(/\s*\(.*\)/, "").trim();
}

/**
 * Get Suhoor time (Fajr, cleaned)
 */
export function getSuhoorTime(fajrTime: string): string {
  return cleanTime(fajrTime);
}

/**
 * Get Iftar time (Maghrib, cleaned)
 */
export function getIftarTime(maghribTime: string): string {
  return cleanTime(maghribTime);
}

/**
 * Get the Hijri date offset from preferences
 */
export function getHijriDateOffset(): number {
  const prefs = getPreferenceValues<Preferences>();
  return parseInt(prefs.hijriDateOffset || "0", 10) || 0;
}

/**
 * Apply the Hijri date offset to a Hijri date from the API.
 * Adjusts day/month/year boundaries (e.g. day 0 rolls back to previous month).
 * Hijri months alternate 30/29 days (simplified).
 */
export const HIJRI_MONTHS: Record<number, string> = {
  1: "Muḥarram",
  2: "Ṣafar",
  3: "Rabīʿ al-Awwal",
  4: "Rabīʿ al-Thānī",
  5: "Jumādá al-Ūlá",
  6: "Jumādá al-Ākhirah",
  7: "Rajab",
  8: "Shaʿbān",
  9: "Ramadan",
  10: "Shawwāl",
  11: "Dhū al-Qaʿdah",
  12: "Dhū al-Ḥijjah",
};

export function adjustHijriDate(
  day: number,
  month: number,
  year: number,
): { day: number; month: number; year: number; monthName: string } {
  const offset = getHijriDateOffset();
  if (offset === 0) return { day, month, year };

  // Hijri months: odd months have 30 days, even months have 29 days (simplified)
  function daysInMonth(m: number): number {
    return m % 2 === 1 ? 30 : 29;
  }

  let d = day + offset;
  let mo = month;
  let y = year;

  // Handle overflow (positive offset)
  while (d > daysInMonth(mo)) {
    d -= daysInMonth(mo);
    mo++;
    if (mo > 12) {
      mo = 1;
      y++;
    }
  }

  // Handle underflow (negative offset)
  while (d < 1) {
    mo--;
    if (mo < 1) {
      mo = 12;
      y--;
    }
    d += daysInMonth(mo);
  }

  return {
    day: d,
    month: mo,
    year: y,
    monthName: HIJRI_MONTHS[mo] || `Month ${mo}`,
  };
}

/**
 * Format a 24h time string based on user's time format preference
 * "system" uses the system locale, "12hr" forces 12h, "24hr" forces 24h
 */
export function formatTime(time24: string): string {
  const prefs = getPreferenceValues<Preferences>();
  const format = prefs.timeFormat || "system";
  const [h, m] = time24.split(":").map(Number);

  if (format === "24hr") {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  if (format === "12hr") {
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  }

  // "system" — detect from macOS settings
  if (isSystem24Hour()) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  } else {
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  }
}

/**
 * Parse "HH:mm" into a Date object for today
 */
export function timeToDate(time24: string): Date {
  const [h, m] = time24.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

/**
 * Get time remaining between now and a target time (as "Xh Ym")
 * Returns null if the target time has passed
 */
export function getTimeRemaining(
  targetTime: string,
): { text: string; totalMinutes: number } | null {
  const now = new Date();
  const target = timeToDate(targetTime);

  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, totalMinutes };
  }
  return { text: `${minutes}m`, totalMinutes };
}

/**
 * Get time remaining until the same time tomorrow (when today's has passed)
 */
export function getTimeRemainingTomorrow(targetTime: string): {
  text: string;
  totalMinutes: number;
} {
  const now = new Date();
  const target = timeToDate(targetTime);
  // Add 24 hours
  target.setDate(target.getDate() + 1);

  const diffMs = target.getTime() - now.getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, totalMinutes };
  }
  return { text: `${minutes}m`, totalMinutes };
}

/**
 * Format a date as DD-MM-YYYY (Aladhan API format)
 */
export function formatDateForApi(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Format a Gregorian date nicely e.g. "Fri, 28 Feb 2026"
 */
export function formatDateReadable(dateStr: string): string {
  // dateStr from Aladhan is like "28 Feb 2026" or "01 Mar 2026"
  return dateStr;
}

/**
 * Get today's date in DD-MM-YYYY format
 */
export function getTodayStr(): string {
  return formatDateForApi(new Date());
}

/**
 * Calculate days between two dates (ignoring time)
 */
export function daysBetween(from: Date, to: Date): number {
  const fromMidnight = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
  );
  const toMidnight = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round(
    (toMidnight.getTime() - fromMidnight.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Check if a Hijri date falls in Ramadan (month 9)
 */
export function isRamadan(hijriMonth: number): boolean {
  return hijriMonth === 9;
}

/**
 * Determine the current fasting status
 */
export function getFastingStatus(
  suhoorTime: string,
  iftarTime: string,
): "before-suhoor" | "fasting" | "after-iftar" {
  const now = new Date();
  const suhoor = timeToDate(suhoorTime);
  const iftar = timeToDate(iftarTime);

  if (now < suhoor) return "before-suhoor";
  if (now >= suhoor && now < iftar) return "fasting";
  return "after-iftar";
}

/**
 * Get a friendly fasting status message
 */
export function getFastingStatusMessage(
  suhoorTime: string,
  iftarTime: string,
): string {
  const status = getFastingStatus(suhoorTime, iftarTime);

  switch (status) {
    case "before-suhoor": {
      const remaining = getTimeRemaining(suhoorTime);
      return remaining
        ? `Suhoor ends in ${remaining.text}`
        : "Suhoor time has passed";
    }
    case "fasting": {
      const remaining = getTimeRemaining(iftarTime);
      return remaining
        ? `Fasting — Iftar in ${remaining.text}`
        : "Iftar time reached!";
    }
    case "after-iftar":
      return "Iftar time has passed. Alhamdulillah!";
  }
}

/**
 * Get a short menu bar title
 */
export function getMenuBarTitle(
  suhoorTime: string,
  iftarTime: string,
  isRamadanNow: boolean,
  daysUntil?: number,
): string {
  if (!isRamadanNow && daysUntil !== undefined && daysUntil > 0) {
    return `${daysUntil}d to Ramadan`;
  }

  if (!isRamadanNow) {
    return "";
  }

  const status = getFastingStatus(suhoorTime, iftarTime);
  switch (status) {
    case "before-suhoor": {
      const remaining = getTimeRemaining(suhoorTime);
      return remaining ? remaining.text : "";
    }
    case "fasting": {
      const remaining = getTimeRemaining(iftarTime);
      return remaining ? remaining.text : "";
    }
    case "after-iftar":
      return "";
  }
}
