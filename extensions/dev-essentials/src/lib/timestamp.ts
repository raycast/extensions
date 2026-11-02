import * as chrono from "chrono-node";
import { applyDuration, describeRelativeTime, parseRelativeTime } from "./duration";

export type InputKind =
  | "now"
  | "unix-seconds"
  | "unix-milliseconds"
  | "unix-microseconds"
  | "unix-nanoseconds"
  | "relative"
  | "iso"
  | "natural";

export type UnixUnit = "auto" | "seconds" | "milliseconds" | "microseconds" | "nanoseconds";

export interface ParsedTime {
  date: Date;
  kind: InputKind;
  /** Human description of how the input was interpreted. */
  label: string;
}

export interface TimeFormat {
  id: string;
  label: string;
  value: string;
}

const MAX_DATE_MS = 8.64e15;

/** `unit` overrides digit-count detection for numeric input, which is ambiguous near the epoch. */
export function parseTimeInput(raw: string, now: Date = new Date(), unit: UnixUnit = "auto"): ParsedTime {
  const input = raw.trim();
  if (!input || /^now$/i.test(input)) return { date: now, kind: "now", label: "Now" };

  if (/^[+-]?\d+(\.\d+)?$/.test(input)) return parseUnix(input, unit);

  const relative = parseRelativeTime(input);
  if (relative) {
    return {
      date: checked(applyDuration(now, relative.parts, relative.direction)),
      kind: "relative",
      label: describeRelativeTime(relative),
    };
  }

  if (/^\d{4}-\d{2}/.test(input)) {
    const date = [input, input.replace(" ", "T")].map((s) => new Date(s)).find((d) => !Number.isNaN(d.getTime()));
    if (date) return { date: checked(date), kind: "iso", label: describeIso(input) };
  }

  const natural = chrono.parseDate(input, now);
  if (natural) return { date: checked(natural), kind: "natural", label: "Natural language date" };

  const fallback = new Date(input);
  if (!Number.isNaN(fallback.getTime())) return { date: checked(fallback), kind: "natural", label: "Date string" };

  throw new Error(`Couldn't understand "${input}"`);
}

function detectUnixUnit(input: string): Exclude<UnixUnit, "auto"> {
  const digits = input.replace(/^[+-]/, "").split(".")[0].length;
  if (digits <= 11) return "seconds";
  if (digits <= 14) return "milliseconds";
  if (digits <= 17) return "microseconds";
  return "nanoseconds";
}

const UNIX_UNIT_MS: Record<Exclude<UnixUnit, "auto">, number> = {
  seconds: 1000,
  milliseconds: 1,
  microseconds: 1e-3,
  nanoseconds: 1e-6,
};

function parseUnix(input: string, unit: UnixUnit): ParsedTime {
  const resolved = unit === "auto" ? detectUnixUnit(input) : unit;
  return {
    date: checked(new Date(Number(input) * UNIX_UNIT_MS[resolved])),
    kind: `unix-${resolved}`,
    label: `Unix ${resolved}${unit === "auto" ? " (auto-detected)" : ""}`,
  };
}

function describeIso(input: string): string {
  const hasTime = /^\d{4}-\d{2}-\d{2}[T ]\d/i.test(input);
  const hasOffset = /(z|[+-]\d{2}(:?\d{2})?)$/i.test(input) && hasTime;
  if (hasOffset) return "ISO 8601";
  return hasTime ? "ISO 8601 (no offset, local time)" : "ISO 8601 date (UTC midnight)";
}

export function isSupportedDate(date: Date): boolean {
  return !Number.isNaN(date.getTime()) && Math.abs(date.getTime()) <= MAX_DATE_MS;
}

function checked(date: Date): Date {
  if (!isSupportedDate(date)) {
    throw new Error("Date is out of the supported range");
  }
  return date;
}

export function formatTime(date: Date, now: Date = new Date()): TimeFormat[] {
  const ms = date.getTime();
  return [
    { id: "unix-seconds", label: "Unix Seconds", value: String(Math.floor(ms / 1000)) },
    { id: "unix-milliseconds", label: "Unix Milliseconds", value: String(ms) },
    { id: "iso-utc", label: "ISO 8601 (UTC)", value: date.toISOString() },
    { id: "iso-local", label: "ISO 8601 (Local)", value: toLocalIso(date) },
    {
      id: "local",
      label: "Local",
      value: new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeStyle: "long" }).format(date),
    },
    { id: "http", label: "RFC 7231 (HTTP)", value: date.toUTCString() },
    { id: "relative", label: "Relative", value: formatRelative(date, now) },
  ];
}

export function toLocalIso(date: Date): string {
  const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}` +
    `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
  );
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365.25 * 86_400_000],
  ["month", 30.44 * 86_400_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
  ["second", 1000],
];

export function formatRelative(date: Date, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= size || unit === "second") return formatter.format(Math.round(diff / size), unit);
  }
  return formatter.format(0, "second");
}
