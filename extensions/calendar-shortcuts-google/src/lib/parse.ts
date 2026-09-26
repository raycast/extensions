export type ParsedDetails = {
  durationMinutes: number;
  location: string;
  description: string;
};

export const CALENDAR_NAMES = {
  personal: "Personal",
  work: "Work",
  shared: "Shared",
  family: "Family",
  hockey: "Hockey",
  birthdays: "Birthdays",
  holidays: "Holidays",
} as const;

export function parseDuration(text: string): number {
  const s = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!s) return 60;

  if (/^\d+$/.test(s)) {
    throw new Error("Add a unit to the duration, e.g. 10m, 2h, 1h 30m, or 1d.");
  }

  let m = s.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/);
  if (m) return Number(m[1]);

  m = s.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)$/);
  if (m) return Number(m[1]) * 60;

  m = s.match(
    /^(\d+)\s*(h|hr|hrs|hour|hours)\s*(\d+)\s*(m|min|mins|minute|minutes)$/,
  );
  if (m) return Number(m[1]) * 60 + Number(m[3]);

  m = s.match(/^(\d+)\s*(d|day|days)$/);
  if (m) return Number(m[1]) * 1440;

  m = s.match(/^(\d+)\s*(d|day|days)\s*(\d+)\s*(h|hr|hrs|hour|hours)$/);
  if (m) return Number(m[1]) * 1440 + Number(m[3]) * 60;

  throw new Error("Duration examples: 20m, 45m, 1h, 1h20m, 1h 30m, 1.5h, 2d.");
}

export function formatDuration(totalMinutes: number): string {
  let mins = Math.round(totalMinutes);
  const days = Math.floor(mins / 1440);
  mins %= 1440;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.join(" ") || "0m";
}

const LOCATION_EXACT = new Map<string, string>([
  ["mcdonalds", "McDonald's"],
  ["mcdonald's", "McDonald's"],
  ["ifly", "iFLY"],
  ["m&s", "M&S"],
  ["b&q", "B&Q"],
  ["nhs", "NHS"],
  ["uk", "UK"],
]);

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "via",
  "with",
]);

function titlePart(part: string): string {
  if (!part) return part;
  if (/^[A-Z0-9]{2,}$/.test(part)) return part;
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

function locationPart(part: string): string {
  if (!part) return part;
  const lower = part.toLowerCase();
  if (LOCATION_EXACT.has(lower)) return LOCATION_EXACT.get(lower)!;

  // Preserve deliberate acronyms and mixed-case brand spellings supplied by the user.
  if (/^[A-Z0-9]{2,}$/.test(part)) return part;
  if (/[a-z][A-Z]|[A-Z].*[A-Z]/.test(part) && /[a-z]/.test(part)) return part;

  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

export function smartTitleCase(value: string): string {
  const raw = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!raw) return raw;

  return raw
    .split(" ")
    .map((word, index, words) => {
      const lower = word.toLowerCase();
      const isEdge = index === 0 || index === words.length - 1;
      if (!isEdge && SMALL_WORDS.has(lower)) return lower;
      return word.split("-").map(titlePart).join("-");
    })
    .join(" ");
}

export function smartLocationCase(value: string): string {
  const raw = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!raw) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  const wholeMatch = LOCATION_EXACT.get(raw.toLowerCase());
  if (wholeMatch) return wholeMatch;

  return raw
    .split(" ")
    .map((word, index, words) => {
      const lower = word.toLowerCase();
      const isEdge = index === 0 || index === words.length - 1;
      if (!isEdge && SMALL_WORDS.has(lower)) return lower;
      return word.split("-").map(locationPart).join("-");
    })
    .join(" ");
}

function classifyPlace(value: string): {
  location: string;
  description: string;
} {
  const raw = String(value || "").trim();
  if (!raw) return { location: "", description: "" };

  const lower = raw.toLowerCase();
  const virtualNames = [
    "zoom",
    "microsoft teams",
    "teams",
    "google meet",
    "meet",
    "webex",
    "facetime",
    "slack huddle",
    "huddle",
  ];

  if (/^https?:\/\//i.test(raw))
    return { location: "", description: `Meeting link: ${raw}` };
  if (virtualNames.includes(lower))
    return {
      location: "",
      description: `Meeting via ${smartLocationCase(raw)}`,
    };
  return { location: smartLocationCase(raw), description: "" };
}

export function parseDetails(
  text?: string,
  defaultDurationMinutes = 60,
): ParsedDetails {
  const raw = String(text || "").trim();
  if (!raw) {
    return {
      durationMinutes: defaultDurationMinutes,
      location: "",
      description: "",
    };
  }

  const m = raw.match(/^(.*?)\s*@\s*(.+)$/);
  if (m) {
    const durationText = m[1].trim();
    const place = classifyPlace(m[2].trim());
    return {
      durationMinutes: durationText
        ? parseDuration(durationText)
        : defaultDurationMinutes,
      location: place.location,
      description: place.description,
    };
  }

  const idx = raw.indexOf("|");
  if (idx >= 0) {
    const durationText = raw.slice(0, idx).trim();
    const place = classifyPlace(raw.slice(idx + 1).trim());
    return {
      durationMinutes: durationText
        ? parseDuration(durationText)
        : defaultDurationMinutes,
      location: place.location,
      description: place.description,
    };
  }

  return { durationMinutes: parseDuration(raw), location: "", description: "" };
}

type Clock = { hour: number; minute: number };

function parseClock(text: string): Clock | null {
  const s = text.trim().toLowerCase();

  let m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (m) {
    let hour = Number(m[1]);
    const minute = Number(m[2] || 0);
    if (hour < 1 || hour > 12 || minute > 59) throw new Error("Invalid time.");
    if (m[3] === "am") hour = hour === 12 ? 0 : hour;
    if (m[3] === "pm") hour = hour === 12 ? 12 : hour + 12;
    return { hour, minute };
  }

  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour > 23 || minute > 59) throw new Error("Invalid time.");
    return { hour, minute };
  }

  return null;
}

function validDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day ||
    dt.getHours() !== hour ||
    dt.getMinutes() !== minute
  ) {
    throw new Error("Invalid date/time.");
  }
  return dt;
}

function withClock(base: Date, clock: Clock): Date {
  return validDate(
    base.getFullYear(),
    base.getMonth() + 1,
    base.getDate(),
    clock.hour,
    clock.minute,
  );
}

const DAYS: Record<string, number> = {
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

function nextWeekday(
  now: Date,
  wanted: number,
  clock: Clock,
  forceNext: boolean,
): Date {
  let delta = (wanted - now.getDay() + 7) % 7;

  if (forceNext) {
    if (delta === 0) delta = 7;
    else delta += 7;
  }

  let base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
  let dt = withClock(base, clock);

  if (!forceNext && dt.getTime() <= now.getTime()) {
    base = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + delta + 7,
    );
    dt = withClock(base, clock);
  }
  return dt;
}

function normalizeWhen(text: string): string {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\bat\b/g, " ")
    .replace(/\bon\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type DateInputStyle = "day-month" | "month-day";

export type ParsedWhen =
  { kind: "timed"; start: Date } | { kind: "all-day"; start: Date };

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextWeekdayDate(now: Date, wanted: number, forceNext: boolean): Date {
  let delta = (wanted - now.getDay() + 7) % 7;

  if (forceNext) {
    if (delta === 0) delta = 7;
    else delta += 7;
  }

  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
}

function numericDateParts(
  first: number,
  second: number,
  style: DateInputStyle,
): { day: number; month: number } {
  const day = style === "month-day" ? second : first;
  const month = style === "month-day" ? first : second;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(
      style === "month-day" ? "Invalid MM/DD date." : "Invalid DD/MM date.",
    );
  }

  return { day, month };
}

function numericDateExample(style: DateInputStyle): string {
  return style === "month-day" ? "09/15" : "15/09";
}

function parseNumericDate(
  first: number,
  second: number,
  yearText: string | undefined,
  now: Date,
  style: DateInputStyle,
  clock?: Clock,
): Date {
  const { day, month } = numericDateParts(first, second, style);
  const year = yearText ? Number(yearText) : now.getFullYear();
  const hour = clock?.hour ?? 0;
  const minute = clock?.minute ?? 0;

  let date: Date;
  try {
    date = validDate(year, month, day, hour, minute);
  } catch {
    throw new Error(
      style === "month-day" ? "Invalid MM/DD date." : "Invalid DD/MM date.",
    );
  }

  if (!yearText) {
    const comparison = clock ? now.getTime() : startOfLocalDay(now).getTime();
    if (
      date.getTime() < comparison ||
      (clock && date.getTime() <= comparison)
    ) {
      try {
        date = validDate(year + 1, month, day, hour, minute);
      } catch {
        throw new Error(
          style === "month-day" ? "Invalid MM/DD date." : "Invalid DD/MM date.",
        );
      }
    }
  }

  return date;
}

/**
 * Parse the natural-language "When" field while preserving whether the user
 * supplied a clock time. Date-only input becomes a real Google all-day event
 * later in the quick-add pipeline; timed input keeps the existing behaviour.
 */
export function parseWhenSpec(
  text: string,
  now = new Date(),
  dateStyle: DateInputStyle = "day-month",
): ParsedWhen {
  const s = normalizeWhen(text);
  if (!s) throw new Error("Enter when, e.g. tomorrow or next Thursday 5pm.");

  let clock = parseClock(s);
  if (clock) {
    let dt = withClock(now, clock);
    if (dt.getTime() <= now.getTime()) {
      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      dt = withClock(tomorrow, clock);
    }
    return { kind: "timed", start: dt };
  }

  // Date-only relative expressions are all-day events.
  if (s === "today" || s === "tomorrow") {
    const add = s === "tomorrow" ? 1 : 0;
    return {
      kind: "all-day",
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + add),
    };
  }

  let m = s.match(/^(next )?([a-z]+)$/);
  if (m && Object.prototype.hasOwnProperty.call(DAYS, m[2])) {
    return {
      kind: "all-day",
      start: nextWeekdayDate(now, DAYS[m[2]], Boolean(m[1])),
    };
  }

  // "tonight 8pm" / "8pm tonight".
  // Unlike a bare time, tonight always means today's date.
  // If the requested time has already passed, keep the user on the correction form.
  m = s.match(/^tonight (.+)$/);
  if (m) {
    clock = parseClock(m[1]);
    if (clock) {
      const dt = withClock(now, clock);
      if (dt.getTime() <= now.getTime()) {
        throw new Error("That time has already passed tonight.");
      }
      return { kind: "timed", start: dt };
    }
  }

  m = s.match(/^(.+) tonight$/);
  if (m) {
    clock = parseClock(m[1]);
    if (clock) {
      const dt = withClock(now, clock);
      if (dt.getTime() <= now.getTime()) {
        throw new Error("That time has already passed tonight.");
      }
      return { kind: "timed", start: dt };
    }
  }

  m = s.match(/^(today|tomorrow) (.+)$/);
  if (m) {
    clock = parseClock(m[2]);
    if (clock) {
      const add = m[1] === "tomorrow" ? 1 : 0;
      return {
        kind: "timed",
        start: withClock(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + add),
          clock,
        ),
      };
    }
  }

  m = s.match(/^(.+) (today|tomorrow)$/);
  if (m) {
    clock = parseClock(m[1]);
    if (clock) {
      const add = m[2] === "tomorrow" ? 1 : 0;
      return {
        kind: "timed",
        start: withClock(
          new Date(now.getFullYear(), now.getMonth(), now.getDate() + add),
          clock,
        ),
      };
    }
  }

  m = s.match(/^(next )?([a-z]+) (.+)$/);
  if (m && Object.prototype.hasOwnProperty.call(DAYS, m[2])) {
    clock = parseClock(m[3]);
    if (clock) {
      return {
        kind: "timed",
        start: nextWeekday(now, DAYS[m[2]], clock, Boolean(m[1])),
      };
    }
  }

  m = s.match(/^(.+) (next )?([a-z]+)$/);
  if (m && Object.prototype.hasOwnProperty.call(DAYS, m[3])) {
    clock = parseClock(m[1]);
    if (clock) {
      return {
        kind: "timed",
        start: nextWeekday(now, DAYS[m[3]], clock, Boolean(m[2])),
      };
    }
  }

  m = s.match(/^([a-z]+) next (.+)$/);
  if (m && Object.prototype.hasOwnProperty.call(DAYS, m[1])) {
    clock = parseClock(m[2]);
    if (clock) {
      return {
        kind: "timed",
        start: nextWeekday(now, DAYS[m[1]], clock, true),
      };
    }
  }

  // Numeric dates follow the app-wide UK/US Date Format setting.
  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (m) {
    return {
      kind: "all-day",
      start: parseNumericDate(Number(m[1]), Number(m[2]), m[3], now, dateStyle),
    };
  }

  m = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))? (.+)$/);
  if (m) {
    clock = parseClock(m[4]);
    if (clock) {
      return {
        kind: "timed",
        start: parseNumericDate(
          Number(m[1]),
          Number(m[2]),
          m[3],
          now,
          dateStyle,
          clock,
        ),
      };
    }
  }

  m = s.match(/^(.+) (\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (m) {
    clock = parseClock(m[1]);
    if (clock) {
      return {
        kind: "timed",
        start: parseNumericDate(
          Number(m[2]),
          Number(m[3]),
          m[4],
          now,
          dateStyle,
          clock,
        ),
      };
    }
  }

  // ISO dates are deliberately unambiguous and work in either date style.
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return {
      kind: "all-day",
      start: validDate(Number(m[1]), Number(m[2]), Number(m[3]), 0, 0),
    };
  }

  m = s.match(/^(\d{4})-(\d{2})-(\d{2}) (.+)$/);
  if (m) {
    clock = parseClock(m[4]);
    if (clock) {
      return {
        kind: "timed",
        start: validDate(
          Number(m[1]),
          Number(m[2]),
          Number(m[3]),
          clock.hour,
          clock.minute,
        ),
      };
    }
  }

  m = s.match(/^(.+) (\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    clock = parseClock(m[1]);
    if (clock) {
      return {
        kind: "timed",
        start: validDate(
          Number(m[2]),
          Number(m[3]),
          Number(m[4]),
          clock.hour,
          clock.minute,
        ),
      };
    }
  }

  throw new Error(
    `Try: tomorrow, Friday, next Thursday, tomorrow 6pm, next Thursday 5pm, ${numericDateExample(dateStyle)}, or ${numericDateExample(dateStyle)} 5pm.`,
  );
}

/**
 * Backwards-compatible helper for code/tests that only need the parsed Date.
 * New quick-add code should use parseWhenSpec() so all-day intent is preserved.
 */
export function parseWhen(
  text: string,
  now = new Date(),
  dateStyle: DateInputStyle = "day-month",
): Date {
  return parseWhenSpec(text, now, dateStyle).start;
}

export function detectBestCalendar(title: string): string | null {
  const s = String(title || "")
    .trim()
    .toLowerCase();
  if (!s) return null;

  const rules: Array<{ calendar: string; patterns: RegExp[] }> = [
    {
      calendar: CALENDAR_NAMES.work,
      patterns: [
        /\bwork\b/,
        /\bshift\b/,
        /\bclient\b/,
        /\bcustomer\b/,
        /\bhelp\s*desk\b/,
        /\bticket\b/,
        /\bsite visit\b/,
        /\bteam meeting\b/,
        /\bstand[ -]?up\b/,
      ],
    },
    {
      calendar: CALENDAR_NAMES.shared,
      patterns: [
        /\bdate night\b/,
        /\bmovie night\b/,
        /\bdinner date\b/,
        /\bflat viewing\b/,
        /\bhouse viewing\b/,
        /\bapartment viewing\b/,
        /\btenancy\b/,
        /\bmove[ -]?in\b/,
        /\bmoving day\b/,
        /\banniversary\b/,
      ],
    },
    {
      calendar: CALENDAR_NAMES.hockey,
      patterns: [
        /\bhockey\b/,
        /\bfixture\b/,
        /\bmens?\s+\d+(?:st|nd|rd|th)?\s+xi\b/,
      ],
    },
    {
      calendar: CALENDAR_NAMES.family,
      patterns: [
        /\bfamily\b/,
        /\bfam\b/,
        /\bmum\b/,
        /\bmom\b/,
        /\bdad\b/,
        /\bparents?\b/,
        /\bsister\b/,
        /\bbrother\b/,
        /\bnan\b/,
        /\bnanna\b/,
        /\bgrandma\b/,
        /\bgrandad\b/,
        /\bgranddad\b/,
        /\bgrandparents?\b/,
      ],
    },
    {
      calendar: CALENDAR_NAMES.personal,
      patterns: [
        /\bdentist\b/,
        /\bdental\b/,
        /\bdoctor\b/,
        /\bgp\b/,
        /\boptician\b/,
        /\boptometrist\b/,
        /\bhaircut\b/,
        /\bbarber\b/,
        /\bcar mot\b/,
        /\bmot\b/,
        /\bcar service\b/,
        /\bservice appointment\b/,
        /\bstudy session\b/,
      ],
    },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((re) => re.test(s))) return rule.calendar;
  }
  return null;
}

export function localDateKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function localDateLabel(
  date: Date,
  dateStyle: DateInputStyle = "day-month",
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  return dateStyle === "month-day"
    ? `${month}/${day}/${year}`
    : `${day}/${month}/${year}`;
}

export function localDateTimeLabel(
  date: Date,
  dateStyle: DateInputStyle = "day-month",
): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${localDateLabel(date, dateStyle)} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}
