import type { HourRange } from "./types";

export type Shade = "business" | "shoulder" | "off";

/** Parses "9-18" / "9:30-17:30" / "22-6" (overnight) into fractional hours. Returns undefined when unparsable. */
export function parseHourRange(s: string | undefined): HourRange | undefined {
  if (!s) return undefined;
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*$/.exec(s);
  if (!m) return undefined;
  const start = Number(m[1]) + Number(m[2] ?? 0) / 60;
  const end = Number(m[3]) + Number(m[4] ?? 0) / 60;
  if (start > 24 || end > 24) return undefined;
  return { start, end };
}

function inRange(hour: number, r: HourRange): boolean {
  if (r.start === r.end) return true;
  return r.start < r.end ? hour >= r.start && hour < r.end : hour >= r.start || hour < r.end;
}

/** Shade of a single wall-clock hour (fractional, 0-24). */
export function shadeOf(hour: number, business: HourRange, shoulder: HourRange): Shade {
  if (inRange(hour, business)) return "business";
  if (inRange(hour, shoulder)) return "shoulder";
  return "off";
}

/** Emoji for a shade, for places that take plain text only, such as the menu bar title (the {dot} placeholder). */
export const SHADE_DOT: Record<Shade, string> = { business: "🟢", shoulder: "🟡", off: "🔴" };

const RANK: Record<Shade, number> = { business: 0, shoulder: 1, off: 2 };

/** Worst shade over a wall-clock window, sampled every 30 minutes. Window in fractional hours; end may exceed 24. */
export function shadeOfWindow(startHour: number, endHour: number, business: HourRange, shoulder: HourRange): Shade {
  let worst: Shade = "business";
  if (endHour <= startHour) endHour = startHour + 0.01;
  for (let h = startHour; h < endHour; h += 0.5) {
    const s = shadeOf(h % 24, business, shoulder);
    if (RANK[s] > RANK[worst]) worst = s;
    if (worst === "off") break;
  }
  return worst;
}
