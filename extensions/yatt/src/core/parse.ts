import type { DateSpec, ParsedExpression, TimeOfDay } from "./types";

/**
 * Parses a time expression such as "19-21 utc", "tomorrow 7:30pm new york", "utc+2 9 2h".
 * Tokens are extracted in order of specificity (dates, fixed offsets, durations, ranges, times);
 * whatever text remains is the zone query. Nothing here touches zones or locations.
 */

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const WEEKDAYS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

// A single time: "19", "1900", "19:00", "19.00", "7pm", "7 pm", "7p", "7:30pm", "noon", "midnight"
const TIME = String.raw`(?:(noon|midnight)|(\d{1,2})(?:[:.](\d{2})|(\d{2}))?\s*(am|pm|a|p)?)`;
const TIME_RE = new RegExp(`(?<![\\w:./+-])${TIME}(?![\\w:./])`, "g");
const RANGE_RE = new RegExp(`(?<![\\w:./+-])${TIME}\\s*(?:-|to|–)\\s*${TIME}(?![\\w:./])`, "g");

function toTime(m: RegExpMatchArray, base: number): TimeOfDay | null {
  const word = m[base];
  if (word === "noon") return { h: 12, m: 0 };
  if (word === "midnight") return { h: 0, m: 0 };
  let h = Number(m[base + 1]);
  let min = 0;
  const digits = m[base + 1];
  if (m[base + 2] !== undefined) min = Number(m[base + 2]);
  else if (m[base + 3] !== undefined) min = Number(m[base + 3]);
  else if (digits.length === 3 || digits.length === 4) {
    // "930" / "1900" written without separator get captured as h=9/19 + 2-digit group by the regex above,
    // so this branch is only reached for odd inputs; keep as a guard.
    h = Number(digits.slice(0, -2));
    min = Number(digits.slice(-2));
  }
  const ap = m[base + 4];
  if (ap) {
    if (h < 1 || h > 12) return null;
    if (ap.startsWith("p") && h !== 12) h += 12;
    if (ap.startsWith("a") && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return null;
  return { h, m: min };
}

export function parseExpression(raw: string): ParsedExpression {
  const out: ParsedExpression = { errors: [] };
  let s = raw
    .toLowerCase()
    .replace(/[–—]/g, "-")
    // "1900z", "19-21utc", "9-11est" → split a zone suffix off the number (am/pm and unit suffixes stay attached)
    .replace(/(\d)(?!am|pm|h\b|hr|hours?|m\b|min|to\b)(z|[a-z]{2,5})\b/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return out;

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean | void) => {
    s = s.replace(re, (...args) => {
      const m = args as unknown as RegExpMatchArray;
      return fn(m) === false ? m[0] : " ";
    });
  };

  // --- dates -------------------------------------------------------------
  const setDate = (d: DateSpec, token?: string) => {
    if (out.date) {
      out.errors.push("more than one date");
      return;
    }
    out.date = d;
    out.dateToken = token;
  };
  take(/(?<![\w:./-])(\d{4})-(\d{1,2})-(\d{1,2})(?![\w:./-])/g, (m) => {
    setDate({ kind: "ymd", y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) });
  });
  take(/\b(today|tomorrow|tmr|tmrw)\b/g, (m) => {
    setDate(m[1] === "today" ? { kind: "today" } : { kind: "tomorrow" });
  });
  take(
    /\b(sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\b/g,
    (m) => {
      setDate({ kind: "weekday", weekday: WEEKDAYS[m[1]] }, m[1]);
    },
  );
  // "29 oct", "oct 29", "29 october", "october 29"
  // Whole month words only, so "augsburg" is not August and "marseille" is not March.
  const MONTH_WORD = String.raw`(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)`;
  take(new RegExp(String.raw`(?<![\w:./-])(\d{1,2})\s*${MONTH_WORD}\b`, "g"), (m) => {
    setDate({ kind: "md", m: MONTHS.indexOf(m[2].slice(0, 3)) + 1, d: Number(m[1]) });
  });
  take(new RegExp(String.raw`\b${MONTH_WORD}\s*(\d{1,2})(?![\w:./-])`, "g"), (m) => {
    setDate({ kind: "md", m: MONTHS.indexOf(m[1].slice(0, 3)) + 1, d: Number(m[2]) });
  });
  // numeric: "29/10", "29/10/2026", "29.10.", "29.10.2026"; a dot form needs a trailing dot or year,
  // or a 1-digit second part, so that "19.30" stays a time.
  take(/(?<![\w:./-])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?![\w:./-])/g, (m) => {
    setDate({ kind: "numeric", a: Number(m[1]), b: Number(m[2]), y: m[3] ? fullYear(m[3]) : undefined });
  });
  take(/(?<![\w:./-])(\d{1,2})\.(\d{1,2})\.(?:(\d{2,4}))?(?![\w:./-])/g, (m) => {
    setDate({ kind: "numeric", a: Number(m[1]), b: Number(m[2]), y: m[3] ? fullYear(m[3]) : undefined });
  });
  take(/(?<![\w:./-])(\d{1,2})\.(\d)(?![\w:./-])/g, (m) => {
    setDate({ kind: "numeric", a: Number(m[1]), b: Number(m[2]) });
  });

  // --- fixed offsets: utc+2, gmt-5:30, utc +0530 ----------------------------
  take(/\b(utc|gmt|z)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?\b/g, (m) => {
    const sign = m[2] === "-" ? -1 : 1;
    out.fixedOffset = sign * (Number(m[3]) * 60 + Number(m[4] ?? 0));
  });

  // --- durations (several add up: "2h 30m") ----------------------------------
  const addDuration = (minutes: number) => {
    out.duration = (out.duration ?? 0) + minutes;
  };
  take(/(?<![\w:./-])\+?(\d{1,2})h(\d{2})(?![\w:./-])/g, (m) => {
    addDuration(Number(m[1]) * 60 + Number(m[2]));
  });
  take(/(?<![\w:./-])\+?(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hour|hours)(?![\w:./-])/g, (m) => {
    addDuration(Math.round(Number(m[1].replace(",", ".")) * 60));
  });
  take(/(?<![\w:./-])\+?(\d+)\s*(m|min|mins|minute|minutes)(?![\w:./-])/g, (m) => {
    addDuration(Number(m[1]));
  });

  // --- ranges ------------------------------------------------------------------
  take(RANGE_RE, (m) => {
    const a = toTime(m, 1);
    const b = toTime(m, 6);
    if (!a || !b) return false;
    if (out.start) {
      out.errors.push("too many times");
      return;
    }
    // "7-9pm": pm on the end applies to a bare start, unless that would put the start after the end ("11-1pm")
    if (!m[5] && m[10] && m[10].startsWith("p") && a.h < 12 && a.h !== 0 && a.h + 12 <= b.h) a.h += 12;
    out.start = a;
    out.end = b;
  });

  // --- single times --------------------------------------------------------------
  const times: TimeOfDay[] = [];
  take(TIME_RE, (m) => {
    const t = toTime(m, 1);
    if (!t) return false;
    times.push(t);
  });
  if (times.length) {
    if (out.start) out.errors.push("too many times");
    else if (times.length === 1) out.start = times[0];
    else if (times.length === 2) {
      out.start = times[0];
      out.end = times[1];
    } else out.errors.push("too many times");
  }
  if (out.duration !== undefined) {
    if (out.end) {
      out.errors.push("range and duration");
      delete out.duration;
    } else if (!out.start) {
      out.errors.push("duration without a start time");
      delete out.duration;
    }
  }

  // --- leftovers ---------------------------------------------------------------------
  const rest = s.replace(/\s+/g, " ").trim();
  if (rest) {
    const words = rest.split(" ");
    const bad = words.filter((w) => /^[\d:.+-]+$/.test(w) || /^\d/.test(w));
    for (const b of bad) out.errors.push(`didn't understand "${b}"`);
    const good = words.filter((w) => !bad.includes(w));
    if (good.length) out.zoneQuery = good.join(" ");
  }
  return out;
}

function fullYear(s: string): number {
  const n = Number(s);
  return s.length <= 2 ? 2000 + n : n;
}

/** Human-readable rendering of a DateSpec for the header when no resolver context is available. */
export function describeDate(d: DateSpec | undefined): string {
  if (!d) return "";
  switch (d.kind) {
    case "today":
      return "today";
    case "tomorrow":
      return "tomorrow";
    case "weekday":
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.weekday];
    case "ymd":
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    case "md":
      return `${d.d} ${MONTHS[d.m - 1]}`;
    case "numeric":
      return `${d.a}/${d.b}${d.y ? `/${d.y}` : ""}`;
  }
}
