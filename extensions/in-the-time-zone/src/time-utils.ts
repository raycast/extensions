import { DateTime } from "luxon";

// Truncated to the minute, so polling it only yields a new value (and a re-render) once a minute. The
// timestamp itself is truncated: truncating the local clock fields would resolve to the wrong instant during
// the repeated hour when daylight saving time ends.
export function getCurrentMinuteISO(): string {
  return new Date(Math.floor(Date.now() / 60000) * 60000).toISOString();
}

// Moves to the nearest multiple of stepMinutes on the local clock of the given time, strictly after it
// (direction 1) or before it (direction -1), e.g. 14:20 snaps to 15:00 or 14:00 with a 60-minute step.
export function snapToGrid(time: DateTime, stepMinutes: number, direction: 1 | -1): DateTime {
  const minuteOfDay = time.hour * 60 + time.minute + (time.second * 1000 + time.millisecond) / 60000;
  const first = direction > 0 ? Math.floor(minuteOfDay / stepMinutes) : Math.ceil(minuteOfDay / stepMinutes);
  const startOfDay = time.startOf("day");
  // Around a daylight saving time change, the nearest grid point is not always the next one in clock order:
  // in the repeated hour, an earlier clock time can still lie ahead, and skipped clock times don't exist.
  // So grid points within three hours on both sides are checked, and the nearest valid one wins.
  const window = Math.ceil(180 / stepMinutes);
  let nearest: DateTime | undefined;
  for (let i = -window; i <= window; i++) {
    for (const occurrence of localOccurrences(startOfDay, (first + i * direction) * stepMinutes)) {
      const distance = direction * (occurrence.toMillis() - time.toMillis());
      if (distance > 0 && (!nearest || distance < direction * (nearest.toMillis() - time.toMillis()))) {
        nearest = occurrence;
      }
    }
  }
  return nearest ?? time.plus({ minutes: direction * stepMinutes });
}

// The instants at which the local clock shows the given minutes after the start of the day: usually one, two
// in the hour repeated when daylight saving time ends, and none in the hour it skips.
function localOccurrences(startOfDay: DateTime, minutes: number): DateTime[] {
  const days = Math.floor(minutes / 1440);
  const localMinutes = minutes - days * 1440;
  const day = startOfDay.plus({ days });
  const target = day.set({ hour: Math.floor(localMinutes / 60), minute: localMinutes % 60 });
  const offsets = new Set([target.minus({ hours: 6 }).offset, target.plus({ hours: 6 }).offset]);
  return [...offsets]
    .map((offset) => DateTime.fromMillis(target.toMillis() + (target.offset - offset) * 60000, { zone: day.zone }))
    .filter((t) => t.hasSame(day, "day") && t.hour * 60 + t.minute === localMinutes);
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
