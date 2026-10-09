import { DateTime } from "luxon";

// Truncated to the minute, so polling it only yields a new value (and a re-render) once a minute.
export function getCurrentMinuteISO(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

// Moves to the next (direction 1) or previous (direction -1) multiple of stepMinutes on the local clock of
// the given time, e.g. 14:20 snaps to 15:00 or 14:00 with a 60-minute step.
export function snapToGrid(time: DateTime, stepMinutes: number, direction: 1 | -1): DateTime {
  const msOfDay = ((time.hour * 60 + time.minute) * 60 + time.second) * 1000 + time.millisecond;
  const stepMs = stepMinutes * 60 * 1000;
  const steps = direction > 0 ? Math.floor(msOfDay / stepMs) + 1 : Math.ceil(msOfDay / stepMs) - 1;
  return time.plus({ milliseconds: steps * stepMs - msOfDay });
}

export type ClockFormatPreference = "system" | "12-hour" | "24-hour";

export function resolveTimeFormat(preference: ClockFormatPreference): string {
  if (preference === "12-hour") return "h:mm a";
  if (preference === "24-hour") return "HH:mm";

  const systemFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
  return systemFormat.hour12 === false || systemFormat.hourCycle?.startsWith("h2") ? "HH:mm" : "h:mm a";
}

export function formatGmtOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function formatDelta(diffMinutes: number, style: "clock" | "text" = "text"): string {
  if (diffMinutes === 0) return "same";

  const sign = diffMinutes > 0 ? "+" : "-";
  const abs = Math.abs(diffMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;

  if (minutes === 0) {
    return `${sign}${hours} hr${hours !== 1 ? "s" : ""}`;
  }

  if (style === "clock") {
    return `${sign}${hours}:${String(minutes).padStart(2, "0")}`;
  }

  return `${sign}${hours}h ${minutes}m`;
}
