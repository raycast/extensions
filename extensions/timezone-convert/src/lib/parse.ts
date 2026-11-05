/**
 * Turns a free-form query such as `9am PST to CET`, `now in Tokyo` or
 * `tomorrow 14:30 Europe/Rome to SF` into an instant plus two zones.
 */

import { resolveZone, TimeZone } from "./zones";
import { ClockParts, instantFromParts, zonedParts } from "./time";

export type Conversion = {
  from: TimeZone;
  to: TimeZone;
  instant: number;
  /** True when the query pinned a wall-clock time rather than "now". */
  explicit: boolean;
};

export type ParseOutcome =
  { kind: "empty" } | { kind: "error"; message: string; hint: string } | { kind: "conversion"; conversion: Conversion };

const HINT = 'Try "9am PST to CET", "now in Tokyo" or "tomorrow 14:30 Europe/Rome to SF".';

type TimeSpec = { hour: number; minute: number; second: number };

type DateSpec =
  | { kind: "ymd"; year?: number; month: number; day: number }
  | { kind: "offset"; days: number }
  | { kind: "weekday"; weekday: number; week: 0 | 1 | -1 };

type LeftResult = { from: TimeZone; instant: number; explicit: boolean };

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAYS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const MONTH_PATTERN =
  "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const WEEKDAY_PATTERN = "(sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?)";

const UNITS: Record<string, number> = {
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 604_800_000,
  week: 604_800_000,
  weeks: 604_800_000,
  h: 3_600_000,
  hr: 3_600_000,
  hrs: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  m: 60_000,
  min: 60_000,
  mins: 60_000,
  minute: 60_000,
  minutes: 60_000,
  s: 1_000,
  sec: 1_000,
  secs: 1_000,
  second: 1_000,
  seconds: 1_000,
};

type SplitResult = { kind: "target"; left: string; to: TimeZone } | { kind: "unknown"; right: string };

function splitTarget(query: string, local: TimeZone): SplitResult | null {
  const separator = /\s+(?:(to|into)|(in))\s+/gi;
  const candidates: { left: string; right: string; explicitTarget: boolean }[] = [];
  for (const match of query.matchAll(separator)) {
    const index = match.index ?? 0;
    candidates.push({
      left: query.slice(0, index).trim(),
      right: query.slice(index + match[0].length).trim(),
      explicitTarget: Boolean(match[1]),
    });
  }

  let unknown: string | null = null;
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];
    const to = resolveZone(candidate.right, local);
    if (to) return { kind: "target", left: candidate.left, to };
    if (candidate.explicitTarget && unknown === null) unknown = candidate.right;
  }
  return unknown === null ? null : { kind: "unknown", right: unknown };
}

function validDate(year: number | undefined, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year ?? 2000, month - 1, day));
  return probe.getUTCMonth() === month - 1;
}

function takeDate(input: string): { spec: DateSpec; rest: string } | null {
  const s = input.trim();
  let match: RegExpExecArray | null;

  if ((match = /^(today|tonight)\b/.exec(s))) {
    return { spec: { kind: "offset", days: 0 }, rest: s.slice(match[0].length) };
  }
  if ((match = /^(tomorrow|tmrw|tmr)\b/.exec(s))) {
    return { spec: { kind: "offset", days: 1 }, rest: s.slice(match[0].length) };
  }
  if ((match = /^yesterday\b/.exec(s))) {
    return { spec: { kind: "offset", days: -1 }, rest: s.slice(match[0].length) };
  }
  if ((match = new RegExp(`^(next|last|this)\\s+${WEEKDAY_PATTERN}\\b`).exec(s))) {
    const week = match[1] === "next" ? 1 : match[1] === "last" ? -1 : 0;
    return {
      spec: { kind: "weekday", weekday: WEEKDAYS[match[2]], week },
      rest: s.slice(match[0].length),
    };
  }
  if ((match = new RegExp(`^${WEEKDAY_PATTERN}\\b`).exec(s))) {
    return { spec: { kind: "weekday", weekday: WEEKDAYS[match[1]], week: 0 }, rest: s.slice(match[0].length) };
  }
  if ((match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?=[t\s,]|$)/.exec(s))) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!validDate(year, month, day)) return null;
    return {
      spec: { kind: "ymd", year, month, day },
      rest: s.slice(match[0].length).replace(/^t(?=\d)/, ""),
    };
  }
  if ((match = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?(?=[\s,]|$)/.exec(s))) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = match[3] === undefined ? undefined : Number(match[3]);
    if (year !== undefined && year < 100) year += 2000;
    if (!validDate(year, month, day)) return null;
    return { spec: { kind: "ymd", year, month, day }, rest: s.slice(match[0].length) };
  }
  if ((match = new RegExp(`^(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_PATTERN}(?:\\s+(\\d{4}))?\\b`).exec(s))) {
    const day = Number(match[1]);
    const month = MONTHS[match[2]];
    const year = match[3] === undefined ? undefined : Number(match[3]);
    if (!validDate(year, month, day)) return null;
    return { spec: { kind: "ymd", year, month, day }, rest: s.slice(match[0].length) };
  }
  if ((match = new RegExp(`^${MONTH_PATTERN}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`).exec(s))) {
    const month = MONTHS[match[1]];
    const day = Number(match[2]);
    const year = match[3] === undefined ? undefined : Number(match[3]);
    if (!validDate(year, month, day)) return null;
    return { spec: { kind: "ymd", year, month, day }, rest: s.slice(match[0].length) };
  }
  return null;
}

function makeTime(hour: number, minute: number, second: number, meridiem?: string): TimeSpec | null {
  if (minute > 59 || second > 59) return null;
  let h = hour;
  if (meridiem) {
    if (h < 1 || h > 12) return null;
    h = h % 12;
    if (meridiem === "pm") h += 12;
  }
  if (h > 23) return null;
  return { hour: h, minute, second };
}

function takeTime(input: string): { spec: TimeSpec; rest: string } | null {
  const s = input.trim();
  let match: RegExpExecArray | null;

  if ((match = /^(noon|midday)\b/.exec(s))) {
    return { spec: { hour: 12, minute: 0, second: 0 }, rest: s.slice(match[0].length) };
  }
  if ((match = /^midnight\b/.exec(s))) {
    return { spec: { hour: 0, minute: 0, second: 0 }, rest: s.slice(match[0].length) };
  }
  if ((match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?(?=[\s,]|$)/.exec(s))) {
    const spec = makeTime(Number(match[1]), Number(match[2]), Number(match[3] ?? "0"), match[4]);
    return spec ? { spec, rest: s.slice(match[0].length) } : null;
  }
  if ((match = /^(\d{1,2})\s*(am|pm)(?=[\s,]|$)/.exec(s))) {
    const spec = makeTime(Number(match[1]), 0, 0, match[2]);
    return spec ? { spec, rest: s.slice(match[0].length) } : null;
  }
  if ((match = /^(\d{1,2})\s*o'?clock(?=[\s,]|$)/.exec(s))) {
    const spec = makeTime(Number(match[1]), 0, 0);
    return spec ? { spec, rest: s.slice(match[0].length) } : null;
  }
  if ((match = /^(\d{1,2})(?=[\s,]|$)/.exec(s))) {
    const spec = makeTime(Number(match[1]), 0, 0);
    return spec ? { spec, rest: s.slice(match[0].length) } : null;
  }
  return null;
}

function parseDuration(text: string): number | null {
  const compact = text.replace(/\s+/g, "");
  if (!compact) return null;
  const pattern = /(\d+(?:\.\d+)?)([a-z]+)/g;
  let total = 0;
  let consumed = 0;
  for (const match of compact.matchAll(pattern)) {
    const unit = UNITS[match[2]];
    if (unit === undefined) return null;
    total += Number(match[1]) * unit;
    consumed += match[0].length;
  }
  return consumed === compact.length ? total : null;
}

function parseRelative(input: string, now: number): { instant: number; zoneText: string } | null {
  let text = input.trim();
  let sign = 1;

  if (/^in\s+/.test(text)) {
    text = text.replace(/^in\s+/, "");
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  } else if (text.startsWith("-")) {
    text = text.slice(1);
    sign = -1;
  }
  if (/\s+ago$/.test(text)) {
    text = text.replace(/\s+ago$/, "");
    sign = -sign;
  }
  if (!/^\d/.test(text)) return null;

  const duration = parseDuration(text);
  if (duration === null) return null;
  return { instant: now + sign * duration, zoneText: "" };
}

function takeZonePrefix(input: string, local: TimeZone): { zone: TimeZone; rest: string } | null {
  const words = input.trim().split(/\s+/);
  for (let count = Math.min(words.length, 4); count >= 1; count--) {
    const zone = resolveZone(words.slice(0, count).join(" "), local);
    if (zone) return { zone, rest: words.slice(count).join(" ") };
  }
  return null;
}

function parseLeft(input: string, local: TimeZone, now: number): LeftResult | null {
  let s = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!s) return { from: local, instant: now, explicit: false };
  s = s.replace(/^(?:at|on|by|from|starting)\s+/, "");

  if (s === "now" || s === "right now") return { from: local, instant: now, explicit: false };
  if (s.startsWith("now ")) {
    const zone = resolveZone(s.slice(4), local);
    return zone ? { from: zone, instant: now, explicit: false } : null;
  }

  const relative = parseRelative(s, now);
  if (relative) {
    const zone = relative.zoneText ? resolveZone(relative.zoneText, local) : local;
    return zone ? { from: zone, instant: relative.instant, explicit: true } : null;
  }

  const zoneOnly = resolveZone(s, local);
  if (zoneOnly) return { from: zoneOnly, instant: now, explicit: false };

  let date: DateSpec | null = null;
  let time: TimeSpec | null = null;
  let from: TimeZone | null = null;

  let guard = 0;
  while (guard++ < 6) {
    s = s.trim();
    if (!s) break;

    if (!date) {
      const taken = takeDate(s);
      if (taken) {
        date = taken.spec;
        s = taken.rest;
        continue;
      }
    }
    if (!time) {
      const taken = takeTime(s);
      if (taken) {
        time = taken.spec;
        s = taken.rest;
        continue;
      }
    }
    if (!from) {
      const taken = takeZonePrefix(s, local);
      if (taken) {
        from = taken.zone;
        s = taken.rest;
        continue;
      }
    }
    break;
  }

  s = s.trim();
  if (s) {
    if (from) return null;
    const zone = resolveZone(s, local);
    if (!zone) return null;
    from = zone;
  }
  if (!from) from = local;
  if (!date && !time) return null;

  const dateParts = resolveDate(date, from, now);
  const clock = time ?? { hour: 0, minute: 0, second: 0 };
  return { from, instant: instantFromParts(from, { ...dateParts, ...clock }), explicit: true };
}

function addDays(parts: ClockParts, days: number): { year: number; month: number; day: number } {
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function resolveDate(spec: DateSpec | null, from: TimeZone, now: number): { year: number; month: number; day: number } {
  const today = zonedParts(from, now);
  if (!spec) return { year: today.year, month: today.month, day: today.day };
  if (spec.kind === "ymd") return { year: spec.year ?? today.year, month: spec.month, day: spec.day };
  if (spec.kind === "offset") return addDays(today, spec.days);

  const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
  let delta = (spec.weekday - weekday + 7) % 7;
  if (spec.week === 1) delta = delta === 0 ? 7 : delta;
  if (spec.week === -1) delta = delta === 0 ? -7 : delta - 7;
  return addDays(today, delta);
}

export function parseQuery(raw: string, local: TimeZone, now: number = Date.now()): ParseOutcome {
  const query = raw.trim().replace(/\s+/g, " ");
  if (!query) return { kind: "empty" };

  const normalized = query.replace(/\s*(?:->|=>|→|⇒)\s*/g, " to ");
  const split = splitTarget(normalized, local);

  if (split?.kind === "unknown") {
    const asTime = takeTime(split.right.toLowerCase());
    if (asTime && !asTime.rest.trim()) {
      return { kind: "error", message: `"${split.right}" is a time, not a time zone.`, hint: 'Try "9am PST to CET".' };
    }
    return { kind: "error", message: `I don't know the time zone "${split.right}".`, hint: HINT };
  }
  if (split?.kind === "target") {
    const left = parseLeft(split.left, local, now);
    if (!left) return { kind: "error", message: `I couldn't read "${split.left}" as a time.`, hint: HINT };
    return {
      kind: "conversion",
      conversion: { from: left.from, to: split.to, instant: left.instant, explicit: left.explicit },
    };
  }

  const zoneOnly = resolveZone(normalized, local);
  if (zoneOnly) {
    return { kind: "conversion", conversion: { from: local, to: zoneOnly, instant: now, explicit: false } };
  }

  if (parseLeft(normalized, local, now)) {
    return { kind: "error", message: "Add a target time zone.", hint: 'For example "9am PST to CET".' };
  }

  if (/\s(?:to|into|in)$/.test(normalized)) {
    return { kind: "error", message: "Add a target time zone.", hint: 'For example "9am PST to CET".' };
  }

  return { kind: "error", message: `I couldn't read "${query}".`, hint: HINT };
}
