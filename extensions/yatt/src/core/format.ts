import { dayNumber, formatOffset, wallParts, zoneAbbreviation, zoneOffset } from "./time";

export type TimeFormat = "24h" | "12h";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatTime(instant: number, tz: string, fmt: TimeFormat): string {
  const p = wallParts(instant, tz);
  const mm = String(p.min).padStart(2, "0");
  if (fmt === "12h") {
    const h12 = p.h % 12 === 0 ? 12 : p.h % 12;
    return `${h12}:${mm} ${p.h < 12 ? "AM" : "PM"}`;
  }
  return `${String(p.h).padStart(2, "0")}:${mm}`;
}

/** "19:00–21:00" or "7:00 PM–9:00 PM". */
export function formatWindow(start: number, end: number | undefined, tz: string, fmt: TimeFormat): string {
  const a = formatTime(start, tz, fmt);
  if (end === undefined) return a;
  return `${a}–${formatTime(end, tz, fmt)}`;
}

/** "2h", "1h 15m", "45m" for a length in milliseconds. */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "Tue 1 Sep". */
export function formatDate(instant: number, tz: string): string {
  const p = wallParts(instant, tz);
  return `${DAYS[p.weekday]} ${p.d} ${MONTHS[p.m - 1]}`;
}

/** "Tue 1 Sep 2026". */
export function formatDateLong(instant: number, tz: string): string {
  const p = wallParts(instant, tz);
  return `${DAYS[p.weekday]} ${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** Calendar-day difference between the same instant seen in two zones (e.g. +1 when Tokyo is already tomorrow). */
export function dayShift(instant: number, tz: string, anchorTz: string): number {
  return dayNumber(instant, tz) - dayNumber(instant, anchorTz);
}

/** "+1d" / "−1d" / "". */
export function formatDayShift(n: number): string {
  if (n === 0) return "";
  return `${n > 0 ? "+" : "−"}${Math.abs(n)}d`;
}

/** Offset of `tz` relative to `anchorTz` at an instant, e.g. "+9h", "−5:30", "±0". */
export function relativeOffset(instant: number, tz: string, anchorTz: string): string {
  return formatOffset(zoneOffset(instant, tz) - zoneOffset(instant, anchorTz));
}

export type TemplateVars = {
  time: string;
  label: string;
  code: string;
  abbr: string;
  date: string;
  day: string;
  offset: string;
  tz: string;
};

/** Fills placeholders; brackets left empty by a blank value ("()" / "[]") are removed with their spacing. */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k as keyof TemplateVars] : m))
    .replace(/\s*[([]\s*[)\]]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function templateVars(opts: {
  start: number;
  end?: number;
  tz: string;
  anchorTz: string;
  label: string;
  code?: string;
  abbrTable?: string[];
  fmt: TimeFormat;
}): TemplateVars {
  const shift = dayShift(opts.start, opts.tz, opts.anchorTz);
  const code = opts.code ?? opts.label;
  const abbr = zoneAbbreviation(opts.start, opts.tz, opts.abbrTable);
  return {
    time: formatWindow(opts.start, opts.end, opts.tz, opts.fmt),
    label: opts.label,
    code,
    // "UTC (UTC)" says nothing twice: leave the abbreviation empty when it repeats the code.
    abbr: abbr === code ? "" : abbr,
    date: formatDate(opts.start, opts.tz),
    day: formatDayShift(shift),
    offset: relativeOffset(opts.start, opts.tz, opts.anchorTz),
    tz: opts.tz,
  };
}
