import * as chrono from "chrono-node";
import { addMinutesHM, humanDuration, parseDuration, relativeDayLabel, todayISO } from "./format";

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

  const duration = parseDuration(remaining);
  if (duration) remaining = remaining.replace(duration.match, " ");

  let date: string | undefined;
  let dateExplicit = false;
  let start: string | undefined;
  let end: string | undefined;
  const results = chrono.parse(remaining, ref, { forwardDate: true });
  if (results.length > 0) {
    const result = results[0];
    remaining = remaining.replace(result.text, " ");
    date = todayISO(result.start.date());
    // A bare time ("3pm") sets a date, but the text did not name a day. Mark the
    // date explicit only when chrono is certain of a day component.
    dateExplicit =
      result.start.isCertain("day") ||
      result.start.isCertain("weekday") ||
      result.start.isCertain("month");
    if (result.start.isCertain("hour")) start = toHM(result.start.date());
    if (result.end?.isCertain("hour")) end = toHM(result.end.date());
  }

  let window: Window | undefined;
  if (!start) {
    window = extractWindow(remaining);
    if (window) remaining = remaining.replace(window.match, " ");
  }

  const name = cleanName(remaining);

  // Derive the commit shape. `dateExplicit` records whether the text named a
  // date, so a caller can tell "no time, but a day" from "no time at all".
  if (start) {
    if (!end) end = addMinutesHM(start, duration?.minutes ?? 30);
    return withPreview({
      kind: "exact",
      name,
      date: date ?? todayISO(ref),
      dateExplicit,
      start,
      end,
      hasRecurrence,
    });
  }
  if (duration) {
    return withPreview(
      {
        kind: "flexible",
        name,
        date: date ?? todayISO(ref),
        dateExplicit,
        durationMinutes: duration.minutes,
        earliest: window?.earliest,
        latest: window?.latest,
        hasRecurrence,
      },
      window?.label,
    );
  }
  // Keep a named date on an otherwise timeless capture ("lunch tomorrow"), so
  // the caller can offer to pick a time instead of dropping the day.
  return withPreview({ kind: "unschedulable", name, date, dateExplicit, hasRecurrence });
}

/** Attach the human preview string to a parsed capture. */
function withPreview(base: Omit<ParsedCapture, "preview">, windowLabel?: string): ParsedCapture {
  const displayName = base.name || "(untitled)";
  const todayIso = todayISO();
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

function toHM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
