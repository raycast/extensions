import { DateTime } from "luxon";

// Truncated to the minute, so polling it only yields a new value (and a re-render) once a minute.
// Truncates the timestamp itself rather than the local clock fields, which would resolve to the wrong
// instant during the repeated hour when daylight saving time ends.
export function getCurrentMinuteISO(): string {
  return new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
}

// Moves to the next (direction 1) or previous (direction -1) multiple of stepMinutes on the local clock of
// the given time, e.g. 14:20 snaps to 15:00 or 14:00 with a 60-minute step.
export function snapToGrid(time: DateTime, stepMinutes: number, direction: 1 | -1): DateTime {
  const minuteOfDay = time.hour * 60 + time.minute + (time.second * 1000 + time.millisecond) / 60000;
  // Starts one grid point early: in the hour repeated when daylight saving time ends, the second occurrence
  // of an earlier clock time can still lie ahead.
  let step = direction > 0 ? Math.floor(minuteOfDay / stepMinutes) : Math.ceil(minuteOfDay / stepMinutes);
  const startOfDay = time.startOf("day");
  for (let attempt = 0; attempt < 48; attempt++, step += direction) {
    const minutes = step * stepMinutes;
    const days = Math.floor(minutes / 1440);
    const localMinutes = minutes - days * 1440;
    const day = startOfDay.plus({ days });
    const target = day.set({ hour: Math.floor(localMinutes / 60), minute: localMinutes % 60 });
    // A local clock time occurs twice in the hour repeated when daylight saving time ends, and not at all in
    // the hour it skips (e.g. 02:00 in a zone that moves from 02:00 to 02:30), so each offset in effect
    // around the target is tried, and the occurrence closest to the time in the requested direction wins.
    const offsets = new Set([target.minus({ hours: 6 }).offset, target.plus({ hours: 6 }).offset]);
    const occurrences = [...offsets]
      .map((offset) => DateTime.fromMillis(target.toMillis() + (target.offset - offset) * 60000, { zone: time.zone }))
      .filter((t) => t.hasSame(day, "day") && t.hour * 60 + t.minute === localMinutes)
      .filter((t) => (direction > 0 ? t > time : t < time))
      .sort((a, b) => direction * (a.toMillis() - b.toMillis()));
    if (occurrences.length > 0) return occurrences[0];
  }
  return time.plus({ minutes: direction * stepMinutes });
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
