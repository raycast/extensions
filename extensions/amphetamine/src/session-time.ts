export interface ParsedTime {
  target: Date;
  durationMinutes: number;
}

export function getDefaultTarget(): Date {
  const defaultTarget = new Date();
  defaultTarget.setHours(defaultTarget.getHours() + 1, 0, 0, 0);

  return defaultTarget;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/** Formats Amphetamine `session time remaining` (seconds) as `HH:MMh` or `MM:SSmin`. */
export function formatRemainingSeconds(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(whole / SECONDS_PER_HOUR);
  const minutes = Math.floor((whole % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = whole % SECONDS_PER_MINUTE;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}h`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}min`;
}

export function getSessionTime(target: Date, now = new Date()): ParsedTime | undefined {
  if (target <= now) {
    return;
  }

  const durationMinutes = Math.ceil((target.getTime() - now.getTime()) / 60000);
  return { target, durationMinutes };
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/**
 * Renders a total length in minutes as non-zero weeks/days/hours/minutes (US English, Oxford-style commas).
 */
export function formatDurationBreakdown(totalMinutes: number): string {
  const whole = Math.max(0, Math.floor(totalMinutes));
  if (whole === 0) {
    return "less than a minute";
  }

  let rest = whole;
  const weeks = Math.floor(rest / MINUTES_PER_WEEK);
  rest %= MINUTES_PER_WEEK;
  const days = Math.floor(rest / MINUTES_PER_DAY);
  rest %= MINUTES_PER_DAY;
  const hours = Math.floor(rest / MINUTES_PER_HOUR);
  const minutes = rest % MINUTES_PER_HOUR;

  const parts: string[] = [];
  if (weeks) parts.push(`${weeks} week${weeks === 1 ? "" : "s"}`);
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);

  if (parts.length === 0) {
    return "less than a minute";
  }

  if (parts.length === 1) {
    const [only] = parts;
    return only;
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}
