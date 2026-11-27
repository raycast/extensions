import { MAX_DURATION_MS } from "./types.ts";
import type { ParsedDuration } from "./types.ts";

const MAX_LABEL_LENGTH = 30;

const UNIT_MS: Record<string, number> = {
  s: 1000,
  sec: 1000,
  secs: 1000,
  second: 1000,
  seconds: 1000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minute: 60_000,
  minutes: 60_000,
  h: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
};

const CLOCK_RE = /\b(?:at|until)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?![\w:])/i;
const COLON_RE = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/;
const NUMBER_UNIT_RE = /(\d+(?:\.\d+)?)\s*([a-z]*)\s*/y;

/** Parses inputs like "25", "1h30", "10:00", "tea 5m" or "at 3:30pm". Returns null when nothing sensible is found. */
export function parseDuration(input: string, now: Date = new Date()): ParsedDuration | null {
  const text = input.trim().replace(/\s+/g, " ");
  if (!text) return null;

  const clock = CLOCK_RE.exec(text);
  if (clock) return parseClock(text, clock, now);
  return parseCountdown(text);
}

function parseClock(text: string, match: RegExpExecArray, now: Date): ParsedDuration | null {
  const hour = toHour24(Number(match[1]), match[3]?.toLowerCase());
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  if (hour === null || minute > 59) return null;

  const rest = (text.slice(0, match.index) + " " + text.slice(match.index + match[0].length)).trim();
  if (/\d/.test(rest)) return null;

  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);

  const ms = Math.ceil((target.getTime() - now.getTime()) / 1000) * 1000;
  return build(ms, rest.split(" "), "clock");
}

function toHour24(hour: number, meridiem?: string): number | null {
  if (!meridiem) return hour <= 23 ? hour : null;
  if (hour < 1 || hour > 12) return null;
  return (hour % 12) + (meridiem === "pm" ? 12 : 0);
}

function parseCountdown(text: string): ParsedDuration | null {
  const words = text.split(" ");
  const start = words.findIndex((w) => /\d/.test(w));
  if (start === -1) return null;

  // The duration is the first word with a digit plus any directly following numbers or unit words.
  let end = start + 1;
  while (end < words.length && (/\d/.test(words[end]) || words[end].toLowerCase() in UNIT_MS)) end++;

  const ms = parseRun(words.slice(start, end).join(" ").toLowerCase());
  if (ms === null) return null;
  return build(ms, [...words.slice(0, start), ...words.slice(end)], "duration");
}

/** Parses a run such as "1h 30m", "1.5", "10:00" or "1 hour 30 minutes" into ms. */
function parseRun(run: string): number | null {
  const colon = COLON_RE.exec(run);
  if (colon) return parseColon(colon);

  const seenFactors = new Set<number>();
  let total = 0;
  let pos = 0;
  let previousUnit = "";

  while (pos < run.length) {
    NUMBER_UNIT_RE.lastIndex = pos;
    const m = NUMBER_UNIT_RE.exec(run);
    if (!m) return null;
    pos = NUMBER_UNIT_RE.lastIndex;

    const unit = m[2] === "" ? bareUnit(previousUnit, pos >= run.length) : m[2];
    const factor = UNIT_MS[unit];
    if (factor === undefined || seenFactors.has(factor)) return null;
    seenFactors.add(factor);
    total += Number(m[1]) * factor;
    previousUnit = unit;
  }
  return Math.round(total);
}

/** A bare number means minutes, or minutes after hours ("1h30"). It is only allowed as the last part. */
function bareUnit(previousUnit: string, isLast: boolean): string {
  if (!isLast) return "";
  if (previousUnit === "") return "m";
  return UNIT_MS[previousUnit] === UNIT_MS.h ? "m" : "";
}

function parseColon(match: RegExpExecArray): number | null {
  const parts = match
    .slice(1)
    .filter((p) => p !== undefined)
    .map(Number);
  if (parts.slice(1).some((p) => p >= 60)) return null;
  const [a, b, c] = parts;
  return c === undefined ? (a * 60 + b) * 1000 : (a * 3600 + b * 60 + c) * 1000;
}

function build(ms: number, labelWords: string[], kind: ParsedDuration["kind"]): ParsedDuration | null {
  if (!Number.isFinite(ms) || ms <= 0 || ms > MAX_DURATION_MS) return null;
  const label = toLabel(labelWords);
  return label ? { ms, label, kind } : { ms, kind };
}

function toLabel(words: string[]): string | undefined {
  const text = words.join(" ").trim().slice(0, MAX_LABEL_LENGTH).trim();
  if (!text) return undefined;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
