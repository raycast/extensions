import * as chrono from "chrono-node";
import { wallMinutes } from "./block-timing";
import { addMinutesHM, clockHM, humanDuration, parseDuration, relativeDayLabel, todayISO } from "./format";

// Client-side capture parsing with chrono-node. It never commits on its own —
// the command always shows this preview first. Recurrence is out of scope; we
// only flag it so the command can route "every ..." to the web.

export type CaptureKind = "exact" | "flexible" | "unschedulable";

export interface ParsedCapture {
  kind: CaptureKind;
  name: string;
  date?: string; // YYYY-MM-DD
  dateExplicit?: boolean; // true only when the text named a date ("tomorrow")
  start?: string; // HH:MM
  end?: string; // HH:MM
  durationMinutes?: number;
  earliest?: string; // HH:MM window bound
  latest?: string; // HH:MM window bound
  hasRecurrence: boolean;
  preview: string;
}

interface Window {
  earliest: string;
  latest: string;
  label: string;
  match: string;
}

const WINDOWS: { test: RegExp; earliest: string; latest: string; label: string }[] = [
  { test: /\bmornings?\b/i, earliest: "06:00", latest: "12:00", label: "morning" },
  { test: /\bafternoons?\b/i, earliest: "12:00", latest: "17:00", label: "afternoon" },
  { test: /\bevenings?\b/i, earliest: "17:00", latest: "21:00", label: "evening" },
  { test: /\b(tonight|nights?)\b/i, earliest: "19:00", latest: "23:00", label: "tonight" },
];

/** Parse a capture line into a preview the command renders before committing. */
export function parseCapture(input: string, ref = new Date()): ParsedCapture {
  const hasRecurrence = /\b(every|daily|weekly|weekdays?|each)\b/i.test(input);
  let remaining = ` ${input} `;

  const duration = captureDuration(remaining, ref);
  // Chrono reads any bare duration ("3h") as an offset from now, so strip each
  // token that parseDuration reads. The first one still sets the minutes.
  for (let d = duration; d; d = captureDuration(remaining, ref)) remaining = remaining.replace(d.match, " ");

  let date: string | undefined;
  let dateExplicit = false;
  let start: string | undefined;
  let end: string | undefined;
  let rangeMinutes: number | undefined;
  let window: Window | undefined;
  const normalized = normalizeTimeWords(remaining);
  const results = chrono.parse(normalized.text, ref, { forwardDate: true });
  if (results.length > 0) {
    const result = results[0];
    const from = normalized.originalOffset(result.index);
    const to = normalized.originalOffset(result.index + result.text.length);
    // A bare time ("3pm") sets a date, but the text did not name a day. Mark the
    // date explicit only when chrono is certain of a day component.
    dateExplicit =
      result.start.isCertain("day") || result.start.isCertain("weekday") || result.start.isCertain("month");
    // Chrono reads "evening" as an implied hour. Keep the word as a window, and
    // keep chrono's date only when the text named a day or today's window ended.
    if (!result.start.isCertain("hour")) window = extractWindow(result.text);
    const prefix = remaining.slice(0, from);
    // Strip only a full "in the"; a bare "in" can end the name ("check in tonight").
    remaining = (window ? prefix.replace(/\bin\s+the\s*$/i, "") : prefix) + " " + remaining.slice(to);
    if (!window || dateExplicit || clockHM(ref) >= window.latest) date = todayISO(result.start.date());
    if (result.start.isCertain("hour")) start = clockHM(result.start.date());
    if (result.end?.isCertain("hour")) {
      end = clockHM(result.end.date());
      // Calendar minutes match the API's wall-clock ranges, including DST days.
      rangeMinutes = wallMinutes(result.start.date(), result.end.date());
      if (rangeMinutes <= 0) rangeMinutes += 24 * 60;
    }
  }

  if (!start && !window) {
    window = extractWindow(remaining);
    if (window) remaining = remaining.replace(window.match, " ");
  }

  const name = cleanName(remaining);

  // Derive the commit shape. `dateExplicit` records whether the text named a
  // date, so a caller can tell "no time, but a day" from "no time at all".
  const today = todayISO(ref);
  if (start) {
    if (!end) end = addMinutesHM(start, duration?.minutes ?? 30);
    return withPreview(
      {
        kind: "exact",
        name,
        date: date ?? today,
        dateExplicit,
        start,
        end,
        durationMinutes: rangeMinutes ?? duration?.minutes ?? 30,
        hasRecurrence,
      },
      today,
    );
  }
  if (duration) {
    return withPreview(
      {
        kind: "flexible",
        name,
        date: date ?? today,
        dateExplicit,
        durationMinutes: duration.minutes,
        earliest: window?.earliest,
        latest: window?.latest,
        hasRecurrence,
      },
      today,
      window?.label,
    );
  }
  // Keep a named date on an otherwise timeless capture ("lunch tomorrow"), so
  // the caller can offer to pick a time instead of dropping the day.
  return withPreview({ kind: "unschedulable", name, date, dateExplicit, hasRecurrence }, today);
}

/** Read a duration, but keep a spaced bare integer ("1h 12 issues") in the title. */
function captureDuration(text: string, ref: Date): ReturnType<typeof parseDuration> {
  const d = parseDuration(text);
  if (!d || !/\s\d+\s*$/.test(d.match)) return d;
  // The Add form keeps "1h 30" as 90 min. In capture text, the integer is minutes only at the end or before a
  // date or time ("gym 1h 30 tomorrow"). Before other words, it is part of the title.
  const rest = text.slice(text.indexOf(d.match) + d.match.length).replace(/^[\s.,;:!?]+/, "");
  const next = rest && chrono.parse(rest, ref, { forwardDate: true })[0];
  if (!rest || (next && /^(in\s+the\s+)?$/i.test(rest.slice(0, next.index)))) return d;
  return parseDuration(d.match.replace(/\s+\d+\s*$/, ""));
}

/** Give chrono clock tokens while retaining offsets into the original title. */
function normalizeTimeWords(input: string): { text: string; originalOffset: (offset: number) => number } {
  const replacements: { end: number; removed: number }[] = [];
  let removed = 0;
  const text = input.replace(/\b(noon|midnight)\b/gi, (word: string, _word: string, offset: number) => {
    const clock = word.toLowerCase() === "noon" ? "12pm" : "12am";
    // Chrono consumes these complete tokens; only their end changes subsequent offsets.
    replacements.push({ end: offset - removed + clock.length, removed: word.length - clock.length });
    removed += word.length - clock.length;
    return clock;
  });
  return {
    text,
    originalOffset: (offset) =>
      offset +
      replacements.reduce((delta, replacement) => delta + (replacement.end <= offset ? replacement.removed : 0), 0),
  };
}

/** Attach the human preview string to a parsed capture. */
function withPreview(base: Omit<ParsedCapture, "preview">, todayIso: string, windowLabel?: string): ParsedCapture {
  const displayName = base.name || "(untitled)";
  let preview = displayName;
  if (base.kind === "exact" && base.date && base.start) {
    preview = `${displayName} · ${relativeDayLabel(base.date, todayIso)} · ${base.start}–${base.end}`;
  } else if (base.kind === "flexible" && base.durationMinutes) {
    const bits = [displayName, humanDuration(base.durationMinutes)];
    if (windowLabel) bits.push(windowLabel);
    if (base.date) bits.push(relativeDayLabel(base.date, todayIso));
    preview = bits.join(" · ");
  } else if (base.date) {
    // A timeless capture that still named a day.
    preview = `${displayName} · ${relativeDayLabel(base.date, todayIso)}`;
  }
  return { ...base, preview };
}

function extractWindow(text: string): Window | undefined {
  for (const w of WINDOWS) {
    const match = w.test.exec(text);
    if (match) return { earliest: w.earliest, latest: w.latest, label: w.label, match: match[0] };
  }
  return undefined;
}

function cleanName(text: string): string {
  return text
    .replace(/\b(at|on|for|from|to|by|next|this|the)\b/gi, " ")
    .replace(/[.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
