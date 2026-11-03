import * as chrono from "chrono-node";
import { wallMinutes } from "./block-timing";
import { addDaysISO, addMinutesHM, clockHM, humanDuration, parseDuration, relativeDayLabel, todayISO } from "./format";

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
    let to = normalized.originalOffset(result.index + result.text.length);
    // A bare time ("3pm") sets a date, but the text did not name a day. Mark the
    // date explicit only when chrono is certain of a day component.
    dateExplicit =
      result.start.isCertain("day") || result.start.isCertain("weekday") || result.start.isCertain("month");
    // Chrono reads "evening" as an implied hour. Keep the word as a window, and
    // keep chrono's date only when the text named a day or today's window ended.
    if (!result.start.isCertain("hour")) window = extractWindow(result.text);
    // Chrono splits "at 6 in the evening" into "at 6" + "evening" (it merges
    // "in the morning"/"in the afternoon" but not "in the evening"/"in the
    // night"). When a certain hour is followed right after by a result that
    // names a window, reconcile the hour into the window (e.g. 06:00 → 18:00
    // for "evening") instead of leaving the bare hour as AM, and consume the
    // adjacent result so its word does not leak into the parsed name.
    let reconciledStart: string | undefined;
    let reconciledEnd: string | undefined;
    let reconciledRange: number | undefined;
    let reconciledDate: string | undefined;
    if (result.start.isCertain("hour")) {
      const adjacent = findAdjacentWindow(results, normalized, remaining, to);
      if (adjacent) {
        window = adjacent.window;
        const startDate = result.start.date();
        const shift = windowHourShift(startDate, window);
        reconciledStart = shift ? shiftClockHM(clockHM(startDate), shift) : clockHM(startDate);
        if (result.end?.isCertain("hour")) {
          const endDate = result.end.date();
          // Chrono already advances the end date when the range crosses
          // midnight ("11-1" → 11:00 today, 01:00 tomorrow); shifting that
          // end by 12 hours would break the overnight span, so leave it.
          const endOvernight = todayISO(endDate) !== todayISO(startDate);
          // A noon end after a start moved to PM is midnight ("11-12 in the evening" → 23:00–00:00).
          const noonAfterPM = shift > 0 && endDate.getHours() === 12;
          const endShift = endOvernight ? 0 : noonAfterPM ? -12 : windowHourShift(endDate, window);
          reconciledEnd = endShift ? shiftClockHM(clockHM(endDate), endShift) : clockHM(endDate);
          // Wall-clock minutes from the reconciled clocks: a shifted start ("12 to 2
          // in the night" → 00:00) moves off chrono's date, so the dates do not apply.
          reconciledRange = (clockToMin(reconciledEnd) - clockToMin(reconciledStart) + 24 * 60) % (24 * 60) || 24 * 60;
        }
        // Carry over a day the user named in the window phrase ("evening
        // tomorrow" → tomorrow). Chrono does not parse "tomorrow" after
        // "evening", so strip the window word and re-parse the rest.
        const dayRef = dateInWindowText(adjacent.result.text, adjacent.window.match, ref);
        if (dayRef) {
          reconciledDate = dayRef;
          dateExplicit = true;
        } else if (!dateExplicit) {
          // Chrono's forwardDate rolled the bare 6am today to tomorrow. The
          // reconciled clock is the user's intended time, so re-derive the
          // day from it: an evening still ahead today stays today (matching
          // the "6 evening" sibling), else it rolls to tomorrow.
          reconciledDate = reconciledStart >= clockHM(ref) ? todayISO(ref) : addDaysISO(todayISO(ref), 1);
        }
        to = adjacent.to;
      }
    }
    const prefix = remaining.slice(0, from);
    // Strip only a full "in the"; a bare "in" can end the name ("check in tonight").
    remaining = (window ? prefix.replace(/\bin\s+the\s*$/i, "") : prefix) + " " + remaining.slice(to);
    if (reconciledDate !== undefined) {
      date = reconciledDate;
    } else if (!window || dateExplicit || clockHM(ref) >= window.latest) {
      date = todayISO(result.start.date());
    }
    if (reconciledStart) start = reconciledStart;
    else if (result.start.isCertain("hour")) start = clockHM(result.start.date());
    if (reconciledEnd) {
      end = reconciledEnd;
      rangeMinutes = reconciledRange;
    } else if (result.end?.isCertain("hour")) {
      end = clockHM(result.end.date());
      // Calendar minutes match the API's wall-clock ranges, including DST days.
      rangeMinutes = wallMinutes(result.start.date(), result.end.date());
      // Chrono can roll the start to next year but not the end ("on sep 15"). Keep the clock span.
      if (rangeMinutes <= 0) rangeMinutes = ((rangeMinutes % (24 * 60)) + 24 * 60) % (24 * 60) || 24 * 60;
      // Chrono reads "11-12 evening" as 23:00 to noon the next day, but the user means midnight.
      // An uncertain start meridiem means a window word implied PM. Keep typed am/pm and 24-hour clocks.
      if (
        end === "12:00" &&
        result.start.date().getHours() > 12 &&
        !result.start.isCertain("meridiem") &&
        !/\d\s*[ap]\.?m\b/i.test(result.text)
      ) {
        end = "00:00";
        rangeMinutes -= 12 * 60;
      }
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
  // date or time ("gym 1h 30 tomorrow", "gym 1h 30 at noon"). Before other words, it is part of the title.
  const rest = text.slice(text.indexOf(d.match) + d.match.length).replace(/^[\s.,;:!?]+/, "");
  const next = rest && chrono.parse(rest, ref, { forwardDate: true })[0];
  // Chrono-node matches many time tokens ("noon", "6pm") without absorbing the connector word in front of
  // them, leaving "at"/"until"/"before"/... (and bare "in") in the prefix before `next.index`. Strip leading
  // connectors — and the optional "the" any of them may take ("before the 6pm", "in the evening") — so a
  // bare integer before a time token stays minutes, not only "in the" before "evening".
  const lead = next ? rest.slice(0, next.index) : "";
  const onlyConnectors =
    lead.replace(/^((at|on|by|to|before|after|around|till|until|from|in)\s+(?:the\s+)?)+/i, "") === "";
  if (!rest || (next && onlyConnectors)) return d;
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

/** Minutes since midnight for an "HH:MM" clock. */
function clockToMin(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

/**
 * The hour shift that reconciles a chrono-parsed bare hour with a window word
 * the user typed. Chrono reads "at 6" as 06:00 (AM); when "in the evening"
 * follows, the user means the PM half. An hour already in the window
 * ("17:00 in the evening") or already PM ("at 6pm in the evening") stays put.
 */
function windowHourShift(date: Date, window: Window): number {
  const hour = date.getHours();
  const minutes = hour * 60 + date.getMinutes();
  if (minutes >= clockToMin(window.earliest) && minutes < clockToMin(window.latest)) return 0;
  // "1 in the night" is the small hours, and "12 in the night" is midnight.
  if (window.label === "tonight" && hour < NIGHT_SMALL_HOURS_END) return 0;
  if (window.label === "tonight" && hour === 12) return -12;
  return hour < 12 ? 12 : 0;
}

// A night hour below this stays AM: "at 5 in the night" is 05:00, "at 7" is 19:00.
const NIGHT_SMALL_HOURS_END = 6;

/** Shift an "HH:MM" clock by whole hours, wrapping at 24h. */
function shiftClockHM(clock: string, hours: number): string {
  return addMinutesHM(clock, hours * 60);
}

/**
 * Find a chrono result that sits right after `after` in `remaining` and names a
 * time-of-day window. Chrono splits "at 6 in the evening" into "at 6" and
 * "evening"; this finds the second half so the certain hour can be reconciled
 * with the window word the user typed. Returns undefined when the next result
 * is not adjacent (a content word sits between) or does not name a window.
 */
function findAdjacentWindow(
  results: chrono.ParsedResult[],
  normalized: { originalOffset: (offset: number) => number },
  remaining: string,
  after: number,
): { result: chrono.ParsedResult; window: Window; to: number } | undefined {
  for (let i = 1; i < results.length; i++) {
    const from = normalized.originalOffset(results[i].index);
    if (from < after) continue;
    const gap = remaining.slice(after, from);
    // Allow only the connectors that link a bare hour to its window word
    // ("at 6 in the evening") — whitespace, punctuation, and the words
    // "in"/"the". Anything else is a name word and breaks the adjacency.
    if (gap.replace(/\b(in|the)\b/gi, "").replace(/[\s.,;:!?-]+/g, "") !== "") return undefined;
    const w = extractWindow(results[i].text);
    if (!w) return undefined;
    return {
      result: results[i],
      window: w,
      to: normalized.originalOffset(results[i].index + results[i].text.length),
    };
  }
  return undefined;
}

/**
 * The date the user named inside a window phrase, when chrono did not parse the
 * day itself. Chrono reads "evening tomorrow" as an uncertain-hour "evening"
 * and never advances to tomorrow, so strip the window word and re-parse the
 * rest ("evening tomorrow" → "tomorrow" → 2026-09-22, day certain). Returns
 * undefined when the phrase named no day.
 */
function dateInWindowText(text: string, windowMatch: string, ref: Date): string | undefined {
  const stripped = text.replace(windowMatch, " ").trim();
  if (!stripped) return undefined;
  const result = chrono.parse(stripped, ref, { forwardDate: true })[0];
  if (!result) return undefined;
  if (!result.start.isCertain("day") && !result.start.isCertain("weekday") && !result.start.isCertain("month")) {
    return undefined;
  }
  return todayISO(result.start.date());
}
