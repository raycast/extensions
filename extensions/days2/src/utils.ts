import { DisplayMode } from "./types";

/**
 * Calculate days between today (local midnight) and a target date string "YYYY-MM-DD".
 * Returns negative for past dates, 0 for today, positive for future.
 */
export function daysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateStr.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format a countdown number into human-readable text based on display mode.
 *
 * Examples:
 *   formatCountdown(0, "days")    => "Today"
 *   formatCountdown(1, "days")    => "Tomorrow"
 *   formatCountdown(48, "days")   => "in 48 days"
 *   formatCountdown(48, "weeks")  => "in 6 weeks, 6 days"
 *   formatCountdown(48, "months") => "in 1 month, 18 days"
 *   formatCountdown(-3, "days")   => "3 days ago"
 */
export function formatCountdown(daysUntil: number, mode: DisplayMode): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil === -1) return "Yesterday";

  const absDays = Math.abs(daysUntil);
  const suffix = daysUntil > 0 ? "" : " ago";
  const prefix = daysUntil > 0 ? "in " : "";

  let text: string;
  switch (mode) {
    case "weeks": {
      const weeks = Math.floor(absDays / 7);
      const remainingDays = absDays % 7;
      if (weeks === 0) {
        text = `${absDays} day${absDays !== 1 ? "s" : ""}`;
      } else if (remainingDays === 0) {
        text = `${weeks} week${weeks !== 1 ? "s" : ""}`;
      } else {
        text = `${weeks} week${weeks !== 1 ? "s" : ""}, ${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
      }
      break;
    }
    case "months": {
      const months = Math.floor(absDays / 30);
      const remainingDays = absDays % 30;
      if (months === 0) {
        text = `${absDays} day${absDays !== 1 ? "s" : ""}`;
      } else if (remainingDays === 0) {
        text = `${months} month${months !== 1 ? "s" : ""}`;
      } else {
        text = `${months} month${months !== 1 ? "s" : ""}, ${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
      }
      break;
    }
    case "days":
    default:
      text = `${absDays} day${absDays !== 1 ? "s" : ""}`;
      break;
  }

  return `${prefix}${text}${suffix}`;
}

const DISPLAY_MODES: DisplayMode[] = ["days", "weeks", "months"];

export function nextDisplayMode(
  current: DisplayMode,
  daysUntil: number,
): DisplayMode {
  const absDays = Math.abs(daysUntil);
  const idx = DISPLAY_MODES.indexOf(current);
  if (idx === -1) return DISPLAY_MODES[0];

  for (let i = 1; i < DISPLAY_MODES.length; i++) {
    const candidate = DISPLAY_MODES[(idx + i) % DISPLAY_MODES.length];
    if (candidate === "weeks" && absDays < 7) continue;
    if (candidate === "months" && absDays < 30) continue;
    return candidate;
  }
  return current;
}

/**
 * Format "YYYY-MM-DD" into a human-readable date like "May 12, 2026"
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function futureDateISO(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function pastDateISO(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
