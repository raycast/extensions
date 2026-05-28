import { DateTime } from "luxon";
import type { ParsedTimestamp } from "../types";
import { normalize } from "./normalize";

type PatternMatch = {
  readonly epochMs: number;
  readonly ambiguous: boolean;
};

/**
 * Candidate Luxon format strings for human-readable month-name inputs.
 * Tried in order; first match wins. Ordered roughly most-specific first so
 * that a string like "Apr 3, 2026, 3:20:45 PM" matches the full format before
 * the shorter ones.
 */
const MONTH_NAME_FORMATS: readonly string[] = [
  // Short month name, 12-hour
  "LLL d, yyyy, h:mm:ss a",
  "LLL d, yyyy, h:mm a",
  "LLL d, yyyy h:mm:ss a",
  "LLL d, yyyy h:mm a",
  // Short month name, 24-hour
  "LLL d, yyyy, HH:mm:ss",
  "LLL d, yyyy, HH:mm",
  "LLL d, yyyy HH:mm:ss",
  "LLL d, yyyy HH:mm",
  // Full month name, 12-hour
  "LLLL d, yyyy, h:mm:ss a",
  "LLLL d, yyyy, h:mm a",
  "LLLL d, yyyy h:mm:ss a",
  "LLLL d, yyyy h:mm a",
  // Full month name, 24-hour
  "LLLL d, yyyy, HH:mm:ss",
  "LLLL d, yyyy, HH:mm",
  "LLLL d, yyyy HH:mm:ss",
  "LLLL d, yyyy HH:mm",
  // Date only
  "LLL d, yyyy",
  "LLLL d, yyyy",
];

/**
 * Normalize a month-name match so Luxon's case-sensitive format tokens
 * (`LLL`, `a`) accept it. We lower-case everything, then title-case the
 * leading word (the month) and upper-case any trailing AM/PM marker.
 */
function normalizeMonthMatch(match: string): string {
  return match
    .replace(/^([A-Za-z]+)/, (m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

/**
 * Parse a bare `yyyy-MM-dd HH:mm:ss[.u]` wall-clock string as UTC milliseconds.
 * Used by the log-format branch; the zone is applied by the caller.
 */
function parseLogWallClock(body: string): number | null {
  const withFrac = DateTime.fromFormat(body, "yyyy-MM-dd HH:mm:ss.u", { zone: "utc" });
  if (withFrac.isValid) return withFrac.toMillis();
  const noFrac = DateTime.fromFormat(body, "yyyy-MM-dd HH:mm:ss", { zone: "utc" });
  return noFrac.isValid ? noFrac.toMillis() : null;
}

/**
 * Common timezone abbreviations → fixed offset in minutes from UTC.
 *
 * Luxon's `z` format token only matches IANA zone names
 * (`America/Los_Angeles`), not three/four-letter abbreviations, so we apply
 * the offset ourselves when the log pattern captures a trailing abbr.
 *
 * Only unambiguous abbreviations are included. CST (US Central vs China
 * Standard), BST (British Summer vs Bangladesh Standard), IST (India vs
 * Israel vs Irish) resolve differently by region and are deliberately
 * omitted — they fall through to the ambiguous branch so the user picks.
 *
 * DST-paired entries are kept alongside their standard-time counterpart;
 * matching is purely by the literal token in the source, so a log that
 * says "EDT" gets -4h regardless of the calendar date.
 */
const TIMEZONE_ABBREVIATIONS: Readonly<Record<string, number>> = {
  // Universal
  UTC: 0,
  GMT: 0,
  Z: 0,
  // North America
  EST: -5 * 60,
  EDT: -4 * 60,
  CDT: -5 * 60,
  MST: -7 * 60,
  MDT: -6 * 60,
  PST: -8 * 60,
  PDT: -7 * 60,
  AKST: -9 * 60,
  AKDT: -8 * 60,
  HST: -10 * 60,
  // Europe
  WET: 0,
  WEST: 60,
  CET: 60,
  CEST: 2 * 60,
  EET: 2 * 60,
  EEST: 3 * 60,
  // Asia / Pacific
  JST: 9 * 60,
  KST: 9 * 60,
  AEST: 10 * 60,
  AEDT: 11 * 60,
  ACST: 9 * 60 + 30,
  ACDT: 10 * 60 + 30,
  AWST: 8 * 60,
  NZST: 12 * 60,
  NZDT: 13 * 60,
};

/**
 * Regex patterns for timestamp extraction, ordered by specificity.
 */
const PATTERNS: readonly {
  readonly name: string;
  readonly regex: RegExp;
  readonly parse: (match: string) => PatternMatch | null;
}[] = [
  // ISO8601 / RFC3339 — explicit timezone, never ambiguous.
  // Also covers RFC5424 syslog, which is just ISO with fractional seconds.
  {
    name: "ISO8601",
    regex: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:?\d{2})/g,
    parse: (match) => {
      const dt = DateTime.fromISO(match, { zone: "utc" });
      return dt.isValid ? { epochMs: dt.toMillis(), ambiguous: false } : null;
    },
  },

  // Nginx/Apache common log format: `03/Apr/2026:15:20:50 +0000`, usually
  // inside square brackets. Always has an explicit offset — never ambiguous.
  //
  // Luxon's `ZZ` token expects `+HH:MM` with a colon, but apache emits
  // `+HHMM` without. We parse the wall clock with `UTC+0` and add the
  // offset manually rather than relying on undocumented token behavior.
  {
    name: "Nginx/Apache CLF",
    regex: /(\d{2}\/[A-Z][a-z]{2}\/\d{4}:\d{2}:\d{2}:\d{2})\s([+-])(\d{2})(\d{2})/g,
    parse: (match) => {
      const m = /^(\d{2}\/[A-Z][a-z]{2}\/\d{4}:\d{2}:\d{2}:\d{2})\s([+-])(\d{2})(\d{2})$/.exec(match);
      if (m === null) return null;
      const [, wallPart, signChar, hh, mm] = m;
      if (wallPart === undefined || signChar === undefined || hh === undefined || mm === undefined) {
        return null;
      }
      const wall = DateTime.fromFormat(wallPart, "dd/LLL/yyyy:HH:mm:ss", {
        zone: "utc",
        locale: "en",
      });
      if (!wall.isValid) return null;
      const sign = signChar === "-" ? 1 : -1; // subtract east-of-UTC to get UTC
      const offsetMinutes = sign * (Number(hh) * 60 + Number(mm));
      return { epochMs: wall.toMillis() + offsetMinutes * 60_000, ambiguous: false };
    },
  },

  // RFC2822: `Wed, 03 Apr 2026 15:20:50 GMT` or `... +0000`.
  // Always carries a zone (named or numeric) — never ambiguous.
  {
    name: "RFC2822",
    regex:
      /(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s+\d{2}:\d{2}:\d{2}\s+(?:GMT|UTC|UT|[A-Z]{1,5}|[+-]\d{4})/g,
    parse: (match) => {
      const dt = DateTime.fromRFC2822(match, { setZone: true });
      return dt.isValid ? { epochMs: dt.toMillis(), ambiguous: false } : null;
    },
  },

  // Log format: YYYY-MM-DD[ T]HH:mm:ss[.fff] with optional trailing uppercase
  // token. The `[ T]` separator also catches bare ISO without an explicit
  // zone (e.g. "2026-04-04T18:02:31"), which is treated as ambiguous.
  {
    name: "Log datetime",
    regex: /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:\s[A-Z]{2,5})?/g,
    parse: (match) => {
      // Normalize the date/time separator so a single Luxon format covers
      // both variants. Scoped to the boundary between YYYY-MM-DD and
      // HH:mm:ss — an unscoped `.replace('T', ' ')` would also mangle
      // trailing timezone abbreviations like PST/EDT/JST.
      const trimmed = match.trim().replace(/^(\d{4}-\d{2}-\d{2})T/, "$1 ");

      // The trailing uppercase token (if any) is either a timezone
      // abbreviation we recognize, or an unrelated word like a log level.
      // We split once and branch on the lookup.
      const suffixMatch = /^(.+?)\s+([A-Z]{2,5})$/.exec(trimmed);
      if (suffixMatch !== null) {
        const body = suffixMatch[1];
        const abbr = suffixMatch[2];
        if (body !== undefined && abbr !== undefined) {
          const offsetMinutes = TIMEZONE_ABBREVIATIONS[abbr];
          if (offsetMinutes !== undefined) {
            const wallMs = parseLogWallClock(body);
            if (wallMs !== null) {
              return {
                epochMs: wallMs - offsetMinutes * 60_000,
                ambiguous: false,
              };
            }
          }
          // Known-bad suffix or unrecognized abbr — fall through to the
          // stripping path below.
        }
      }

      // No (known) timezone — strip any trailing uppercase token and
      // parse the wall-clock as ambiguous UTC so the user can reinterpret.
      const stripped = trimmed.replace(/\s+[A-Z]{2,5}$/, "");
      const wallMs = parseLogWallClock(stripped);
      return wallMs !== null ? { epochMs: wallMs, ambiguous: true } : null;
    },
  },

  // Slash-separated date: YYYY/MM/DD[ T]HH:mm:ss[.fff] — always ambiguous.
  {
    name: "Slash datetime",
    regex: /\d{4}\/\d{2}\/\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?/g,
    parse: (match) => {
      const trimmed = match.replace("T", " ");

      const withFrac = DateTime.fromFormat(trimmed, "yyyy/MM/dd HH:mm:ss.u", { zone: "utc" });
      if (withFrac.isValid) return { epochMs: withFrac.toMillis(), ambiguous: true };

      const noFrac = DateTime.fromFormat(trimmed, "yyyy/MM/dd HH:mm:ss", { zone: "utc" });
      if (noFrac.isValid) return { epochMs: noFrac.toMillis(), ambiguous: true };

      return null;
    },
  },

  // Unix epoch — inherently UTC, never ambiguous.
  // Supports seconds (10 digits, optional fractional), milliseconds (13),
  // microseconds (16), and nanoseconds (19). Longer variants come first so
  // leftmost-alternation picks the most precise interpretation.
  //
  // 16- and 19-digit values exceed Number.MAX_SAFE_INTEGER near present-day
  // timestamps, so we parse via BigInt and divide down to milliseconds.
  {
    name: "Unix epoch",
    regex: /(?<!\d)\d{19}(?!\d)|(?<!\d)\d{16}(?!\d)|(?<!\d)\d{13}(?!\d)|(?<!\d)\d{10}(?:\.\d{1,3})?(?!\d)/g,
    parse: (match) => {
      if (match.length === 19) {
        // Nanoseconds. Divide by 1_000_000 in BigInt to avoid precision loss.
        const ms = Number(BigInt(match) / 1_000_000n);
        return Number.isFinite(ms) ? { epochMs: ms, ambiguous: false } : null;
      }
      if (match.length === 16) {
        // Microseconds. 2026 is ~1.77e15 which is at the edge of safe Number
        // range; use BigInt for safety.
        const ms = Number(BigInt(match) / 1_000n);
        return Number.isFinite(ms) ? { epochMs: ms, ambiguous: false } : null;
      }
      const num = Number(match);
      if (!Number.isFinite(num)) return null;

      if (match.length === 13 && !match.includes(".")) {
        return { epochMs: num, ambiguous: false };
      }

      return { epochMs: Math.round(num * 1000), ambiguous: false };
    },
  },

  // MongoDB ObjectID: 24-character hex string where the first 4 bytes (8 hex
  // chars) encode a Unix timestamp in seconds. Always UTC, never ambiguous.
  //
  // Placed after the epoch pattern so pure-digit strings are handled there,
  // and before syslog/month-name patterns which can't produce hex. A range
  // check (year 2000–2100) reduces false positives from arbitrary 24-char
  // hex strings (e.g. truncated SHA hashes).
  {
    name: "MongoDB ObjectID",
    regex: /\b[0-9a-fA-F]{24}\b/g,
    parse: (match) => {
      const timestampHex = match.slice(0, 8);
      const epochSeconds = parseInt(timestampHex, 16);

      // Sanity: reject if outside 2000-01-01 .. 2100-01-01
      if (epochSeconds < 946684800 || epochSeconds > 4102444800) return null;

      return { epochMs: epochSeconds * 1000, ambiguous: false };
    },
  },

  // UUID v7 (RFC 9562): the first 48 bits encode a Unix timestamp in
  // milliseconds. In the canonical string form `xxxxxxxx-xxxx-7xxx-yxxx-…`
  // that's the 12 hex digits before the version nibble. The version field
  // (`7`) and variant bits (`8`/`9`/`a`/`b`) are validated structurally.
  // Always UTC, never ambiguous.
  //
  // Placed after MongoDB ObjectID so 24-char hex strings are tried first
  // (a UUID is 36 chars with dashes — no collision risk) and before
  // syslog/month-name patterns which can't produce hex.
  {
    name: "UUID v7",
    regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-7[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}\b/g,
    parse: (match) => {
      // First 48 bits = first 8 hex chars + next 4 hex chars (positions 9-12).
      const msHex = match.slice(0, 8) + match.slice(9, 13);
      const epochMs = parseInt(msHex, 16);

      // Sanity: reject if outside 2000-01-01 .. 2100-01-01
      if (epochMs < 946684800000 || epochMs > 4102444800000) return null;

      return { epochMs, ambiguous: false };
    },
  },

  // Syslog RFC3164: `Apr  3 15:20:50` (no year, no timezone). Single-digit
  // days are space-padded per spec ("Apr  3" with two spaces), but we accept
  // one-or-more whitespace to be lenient. Doubly ambiguous: missing year is
  // assumed to be the current year, missing timezone is assumed UTC (flagged
  // via the standard `ambiguous` mechanism so the user can override).
  //
  // Does not collide with the month-name pattern: month-name requires a 4-digit
  // year, which can't appear in the `HH:mm:ss` position syslog expects here.
  {
    name: "Syslog RFC3164",
    regex: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\b/g,
    parse: (match) => {
      const normalized = match.replace(/\s+/g, " ");
      const currentYear = DateTime.now().year;
      const dt = DateTime.fromFormat(`${currentYear.toString()} ${normalized}`, "yyyy LLL d HH:mm:ss", { zone: "utc" });
      return dt.isValid ? { epochMs: dt.toMillis(), ambiguous: true } : null;
    },
  },

  // Human-readable month-name formats: "Apr 3, 2026, 3:20 PM",
  // "April 3, 2026 15:20", "Apr 3, 2026" (date-only), etc.
  // Always ambiguous — no timezone component.
  {
    name: "Localized English",
    regex:
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:[a-z]+)?\b\s+\d{1,2},?\s+\d{4}(?:(?:,\s+|\s+)\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?)?/gi,
    parse: (match) => {
      const normalized = normalizeMonthMatch(match.trim());
      for (const fmt of MONTH_NAME_FORMATS) {
        const dt = DateTime.fromFormat(normalized, fmt, { zone: "utc" });
        if (dt.isValid) return { epochMs: dt.toMillis(), ambiguous: true };
      }
      return null;
    },
  },

  // Date-less time: "15:20", "15:20:30", "15:20 EST", "15:20:30.250 PST".
  //
  // This pattern only matches when an entire line consists of a bare time
  // (optionally with a trailing timezone abbreviation). Line-anchoring via
  // `/m` and the use of horizontal whitespace `[ \t]` — never `\s`, which
  // would include newlines — ensures we don't false-match times embedded in
  // log prose like "request took 15:20 to complete".
  //
  // The calendar date is filled in from today's UTC date at parse time.
  // If the line carries a recognized abbreviation the result is exact;
  // otherwise it's ambiguous so the user can reinterpret in a specific
  // zone. Intended for on-call scenarios where a ticket or Slack message
  // says "incident started at 15:20 EST" with "today" implied.
  //
  // Comes last in PATTERNS so more specific formats claim their ranges
  // first — a full "2026-04-04 15:20:00 PST" is picked up by the log
  // pattern and this one never fires on it.
  {
    name: "Bare time",
    regex: /^[ \t]*\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,6})?(?:[ \t]+[A-Z]{2,5})?[ \t]*$/gm,
    parse: (match) => {
      const parts = /^[ \t]*(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{1,6})?)(?:[ \t]+([A-Z]{2,5}))?[ \t]*$/.exec(match);
      if (parts === null) return null;
      const [, time, abbr] = parts;
      if (time === undefined) return null;

      // Combine the time with today's UTC midnight. We try the most
      // precise format first so fractional seconds are preserved when
      // present.
      const today = DateTime.utc().startOf("day");
      let combined: DateTime | null = null;
      for (const fmt of ["H:mm:ss.u", "H:mm:ss", "H:mm"]) {
        const candidate = DateTime.fromFormat(time, fmt, { zone: "utc" });
        if (candidate.isValid) {
          combined = today.set({
            hour: candidate.hour,
            minute: candidate.minute,
            second: candidate.second,
            millisecond: candidate.millisecond,
          });
          break;
        }
      }
      if (combined === null) return null;

      const wallMs = combined.toMillis();
      // Recognized abbreviation → exact offset. Unknown abbreviation or
      // no abbreviation → ambiguous; the user picks a zone in the UI.
      if (abbr !== undefined) {
        const offsetMinutes = TIMEZONE_ABBREVIATIONS[abbr];
        if (offsetMinutes !== undefined) {
          return { epochMs: wallMs - offsetMinutes * 60_000, ambiguous: false };
        }
      }
      return { epochMs: wallMs, ambiguous: true };
    },
  },
];

/**
 * Maximum timestamps to extract per ingestion.
 *
 * Sized for incident-scale pastes (multi-service log dumps, a few hundred
 * lines) rather than as a tight guardrail. Truncation is surfaced in the
 * UI subtitle, so users who hit the cap know they've hit it.
 */
export const MAX_EXTRACT = 500;

export type ExtractResult = {
  readonly timestamps: readonly ParsedTimestamp[];
  /**
   * True when extraction stopped because it hit MAX_EXTRACT before
   * exhausting the input. Callers should surface this so users know
   * the list they see isn't everything.
   */
  readonly truncated: boolean;
};

/**
 * Parse a single input string and return all detected timestamps.
 * Each match's source line is captured as the initial data.
 *
 * Deduplication is by character-range overlap: once a span of the input has
 * been claimed by an earlier (more specific) pattern, later patterns can't
 * re-match any position inside it. This is what keeps e.g. the relaxed log
 * pattern from double-reporting the prefix of an ISO8601-with-Z match.
 */
export function extractTimestamps(input: string): ExtractResult {
  const results: ParsedTimestamp[] = [];
  const claimedRanges: { start: number; end: number }[] = [];
  let truncated = false;

  function overlapsClaimed(start: number, end: number): boolean {
    return claimedRanges.some((r) => start < r.end && end > r.start);
  }

  outer: for (const { name, regex, parse } of PATTERNS) {
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(input)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (overlapsClaimed(start, end)) continue;

      const result = parse(match[0]);
      if (result === null) continue;

      const lineStart = input.lastIndexOf("\n", start) + 1;
      const lineEnd = input.indexOf("\n", start);
      const data = input.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim();

      claimedRanges.push({ start, end });
      results.push({
        ...normalize(result.epochMs, data),
        ambiguous: result.ambiguous,
        label: null,
        url: null,
        source: match[0],
        format: name,
      });

      if (results.length >= MAX_EXTRACT) {
        truncated = true;
        break outer;
      }
    }
  }

  return { timestamps: results, truncated };
}
