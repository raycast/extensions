import { parseDuration, todayISO } from "./format";

export interface TimingFields {
  start: Date | null;
  end: Date | null;
  duration: string;
  startFullDay?: boolean;
  endFullDay?: boolean;
}
export type BlockTiming =
  | { kind: "exact"; start: Date; end: Date; minutes: number }
  | { kind: "flexible"; date?: string; minutes: number }
  | { kind: "inbox"; date?: string };

/** The API uses local wall-clock ranges, not elapsed milliseconds across DST. */
export function wallMinutes(from: Date, to: Date): number {
  const wall = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
  return (wall(to) - wall(from)) / 60000;
}

export function shiftWallMinutes(date: Date, minutes: number): Date {
  const shifted = new Date(date);
  shifted.setMinutes(shifted.getMinutes() + minutes, 0, 0);
  if (wallMinutes(date, shifted) !== minutes)
    throw new Error("That time does not exist on this day. Choose explicit start and end times.");
  return shifted;
}

/** Full-day picker values are dates, never implicit midnight event boundaries. */
export function resolveBlockTiming(fields: TimingFields): BlockTiming {
  for (const date of [fields.start, fields.end]) {
    if (date && Number.isNaN(date.getTime())) throw new Error("Choose a valid date and time.");
  }
  const start = fields.startFullDay ? null : fields.start;
  const end = fields.endFullDay ? null : fields.end;
  if (fields.end && fields.endFullDay) throw new Error("Add a time to End, or clear it and use Duration.");
  if (start && end) {
    const minutes = wallMinutes(start, end);
    validateMinutes(minutes);
    return { kind: "exact", start, end, minutes };
  }
  const text = fields.duration.trim();
  const minutes = text ? parseDuration(text)?.minutes : start || end ? 30 : undefined;
  if (text && !minutes) throw new Error("Enter a duration such as 90m, 1h30, or 2 hours.");
  if (minutes !== undefined) {
    validateMinutes(minutes);
    if (start) return { kind: "exact", start, end: shiftWallMinutes(start, minutes), minutes };
    if (end) {
      const derived = shiftWallMinutes(end, -minutes);
      if (fields.start && todayISO(fields.start) !== todayISO(derived))
        throw new Error("The calculated start is on a different day. Choose its start time explicitly.");
      return { kind: "exact", start: derived, end, minutes };
    }
    return { kind: "flexible", date: fields.start ? todayISO(fields.start) : undefined, minutes };
  }
  return { kind: "inbox", date: fields.start ? todayISO(fields.start) : undefined };
}

function validateMinutes(minutes: number) {
  // The server stores a span of 5 minutes or more.
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 1440) {
    throw new Error(
      "End must be at least 5 minutes after Start, and the block must be at most 24 hours. For an overnight block, choose the next day for End.",
    );
  }
}
