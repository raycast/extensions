import {
  DateComponents,
  ZoneSpec,
  localTimeZone,
  parseZone,
  toInstantFromComponents,
  zoneDisplayName,
} from "./timezone";

export interface ParseSuccess {
  ok: true;
  input: string;
  sourceZone: ZoneSpec;
  sourceZoneLabel: string;
  date: Date;
  matchedPattern: string;
}

export interface ParseFailure {
  ok: false;
  input: string;
  sourceZone: ZoneSpec;
  sourceZoneLabel: string;
  error: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

enum ParseState {
  Unknown = "unknown",
  Digit = "digit",
  DigitDash = "digit-dash",
  DigitSlash = "digit-slash",
  DigitAlpha = "digit-alpha",
  Alpha = "alpha",
}

type ParserFn = (input: string, sourceZone: ZoneSpec) => Date | null;

type ParseWithLabel = {
  label: string;
  parser: ParserFn;
};

const monthMap: Record<string, number> = {
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

const maxDateMilliseconds = 8_640_000_000_000_000;

function expandTwoDigitYear(value: number): number {
  return value >= 69 ? 1900 + value : 2000 + value;
}

function parseMonthToken(token: string): number | null {
  return monthMap[token.toLowerCase()] ?? null;
}

function parseFractionMilliseconds(rawFraction?: string): number {
  if (!rawFraction) {
    return 0;
  }
  const normalized = `${rawFraction}000`.slice(0, 3);
  return Number(normalized);
}

function applyMeridiem(hour: number, meridiem?: string): number | null {
  if (!meridiem) {
    return hour;
  }

  const upper = meridiem.toUpperCase();
  if (hour < 1 || hour > 12) {
    return null;
  }

  if (upper === "AM") {
    return hour === 12 ? 0 : hour;
  }

  if (upper === "PM") {
    return hour === 12 ? 12 : hour + 12;
  }

  return null;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  return candidate.getUTCFullYear() === year && candidate.getUTCMonth() + 1 === month && candidate.getUTCDate() === day;
}

function buildDateFromComponents(base: DateComponents, sourceZone: ZoneSpec): Date | null {
  const hour = base.hour ?? 0;
  const minute = base.minute ?? 0;
  const second = base.second ?? 0;
  const millisecond = base.millisecond ?? 0;

  if (!isValidCalendarDate(base.year, base.month, base.day)) {
    return null;
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    return null;
  }

  if (millisecond < 0 || millisecond > 999) {
    return null;
  }

  return toInstantFromComponents(base, sourceZone);
}

function parseComponentsWithMeridiem(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  sourceZone: ZoneSpec,
  meridiem?: string,
): Date | null {
  const normalizedHour = applyMeridiem(hour, meridiem);
  if (normalizedHour === null) {
    return null;
  }

  return buildDateFromComponents(
    {
      year,
      month,
      day,
      hour: normalizedHour,
      minute,
      second,
      millisecond,
    },
    sourceZone,
  );
}

function parseNow(input: string): Date | null {
  if (!/^now/i.test(input.trim())) {
    return null;
  }

  const unixSeconds = Math.trunc(Date.now() / 1000);
  return new Date(unixSeconds * 1000);
}

function parseAgo(input: string): Date | null {
  const match = input.trim().match(/^(\d+)\s+(minutes?|hours?|day|days)\s+ago$/i);
  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount)) {
    return null;
  }

  let multiplier = 0;
  if (unit.startsWith("minute")) {
    multiplier = 60_000;
  } else if (unit.startsWith("hour")) {
    multiplier = 3_600_000;
  } else {
    multiplier = 86_400_000;
  }

  return new Date(Date.now() - amount * multiplier);
}

function parseNumeric(input: string, sourceZone: ZoneSpec): Date | null {
  if (!/^\d+$/.test(input)) {
    return null;
  }

  if (input.length === 14 && input.startsWith("2")) {
    const match = input.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (!match) {
      return null;
    }

    return parseComponentsWithMeridiem(
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
      0,
      sourceZone,
    );
  }

  if (input.length === 8 && input.startsWith("2")) {
    const match = input.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!match) {
      return null;
    }
    return buildDateFromComponents(
      {
        year: Number(match[1]),
        month: Number(match[2]),
        day: Number(match[3]),
      },
      sourceZone,
    );
  }

  if (input.length === 4 && input.startsWith("2")) {
    return buildDateFromComponents(
      {
        year: Number(input),
        month: 1,
        day: 1,
      },
      sourceZone,
    );
  }

  let milliseconds: number | null = null;

  try {
    const numeric = BigInt(input);

    if (input.length > 16) {
      milliseconds = Number(numeric / 1_000_000n);
    } else if (input.length > 13) {
      milliseconds = Number(numeric / 1_000n);
    } else if (input.length > 10) {
      milliseconds = Number(numeric);
    } else {
      milliseconds = Number(numeric * 1_000n);
    }
  } catch {
    return null;
  }

  if (milliseconds === null || !Number.isFinite(milliseconds)) {
    return null;
  }

  if (milliseconds < 0 || Math.abs(milliseconds) > maxDateMilliseconds) {
    return null;
  }

  return new Date(milliseconds);
}

function parseChineseDate(input: string, sourceZone: ZoneSpec): Date | null {
  const match = input.trim().match(/^(\d{4})年(\d{1,2})月(\d{1,2})日(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");

  return parseComponentsWithMeridiem(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    hour,
    minute,
    0,
    0,
    sourceZone,
  );
}

function parseDashDate(input: string, sourceZone: ZoneSpec): Date | null {
  const plainDate = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (plainDate) {
    return buildDateFromComponents(
      {
        year: Number(plainDate[1]),
        month: Number(plainDate[2]),
        day: Number(plainDate[3]),
      },
      sourceZone,
    );
  }

  const yearMonth = input.match(/^(\d{4})-(\d{1,2})$/);
  if (yearMonth) {
    return buildDateFromComponents(
      {
        year: Number(yearMonth[1]),
        month: Number(yearMonth[2]),
        day: 1,
      },
      sourceZone,
    );
  }

  const monthText = input.match(/^(\d{4})-([A-Za-z]{3})-(\d{1,2})$/);
  if (monthText) {
    const month = parseMonthToken(monthText[2]);
    if (!month) {
      return null;
    }

    return buildDateFromComponents(
      {
        year: Number(monthText[1]),
        month,
        day: Number(monthText[3]),
      },
      sourceZone,
    );
  }

  const dateTime = input.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?(?:[.,](\d{1,9}))?(?:\s*(AM|PM))?$/i,
  );
  if (!dateTime) {
    return null;
  }

  return parseComponentsWithMeridiem(
    Number(dateTime[1]),
    Number(dateTime[2]),
    Number(dateTime[3]),
    Number(dateTime[4]),
    Number(dateTime[5]),
    Number(dateTime[6] ?? "0"),
    parseFractionMilliseconds(dateTime[7]),
    sourceZone,
    dateTime[8],
  );
}

function parseSlashDate(input: string, sourceZone: ZoneSpec): Date | null {
  const match = input.match(
    /^(\d{1,4})\/(\d{1,2})\/(\d{1,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[.,](\d{1,9}))?(?:\s*(AM|PM))?)?$/i,
  );
  if (!match) {
    return null;
  }

  const a = match[1];
  const b = match[2];
  const c = match[3];
  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");
  const second = Number(match[6] ?? "0");
  const millisecond = parseFractionMilliseconds(match[7]);
  const meridiem = match[8];

  const attempts: Array<{ year: number; month: number; day: number }> = [];

  if (a.length === 4) {
    attempts.push({ year: Number(a), month: Number(b), day: Number(c) });
  } else if (c.length === 4) {
    attempts.push({ year: Number(c), month: Number(a), day: Number(b) });
  } else if (a.length <= 2 && b.length <= 2 && c.length <= 2) {
    attempts.push({ year: expandTwoDigitYear(Number(a)), month: Number(b), day: Number(c) });
    attempts.push({ year: expandTwoDigitYear(Number(c)), month: Number(a), day: Number(b) });
  }

  for (const attempt of attempts) {
    const candidate = parseComponentsWithMeridiem(
      attempt.year,
      attempt.month,
      attempt.day,
      hour,
      minute,
      second,
      millisecond,
      sourceZone,
      meridiem,
    );
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function parseDayMonthName(input: string, sourceZone: ZoneSpec): Date | null {
  const match = input.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4}),\s*(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return null;
  }

  const month = parseMonthToken(match[2]);
  if (!month) {
    return null;
  }

  return parseComponentsWithMeridiem(
    Number(match[3]),
    month,
    Number(match[1]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? "0"),
    0,
    sourceZone,
  );
}

function parseMonthNameDate(input: string, sourceZone: ZoneSpec): Date | null {
  const match = input
    .trim()
    .match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM))?$/i);
  if (!match) {
    return null;
  }

  const month = parseMonthToken(match[1]);
  if (!month) {
    return null;
  }

  const hour = Number(match[4] ?? "0");
  const minute = Number(match[5] ?? "0");
  const second = Number(match[6] ?? "0");

  return parseComponentsWithMeridiem(
    Number(match[3]),
    month,
    Number(match[2]),
    hour,
    minute,
    second,
    0,
    sourceZone,
    match[7],
  );
}

function parseAnsiStyle(input: string, sourceZone: ZoneSpec): Date | null {
  const match = input
    .trim()
    .match(/^(?:[A-Za-z]{3}\s+)?([A-Za-z]{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(\d{4})$/);
  if (!match) {
    return null;
  }

  const month = parseMonthToken(match[1]);
  if (!month) {
    return null;
  }

  return parseComponentsWithMeridiem(
    Number(match[6]),
    month,
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    sourceZone,
  );
}

function hasExplicitTimeZone(input: string): boolean {
  const trimmed = input.trim();
  if (/\b(?:UTC|GMT)\b/i.test(trimmed)) {
    return true;
  }

  if (/Etc\/GMT[+-]\d{1,2}/i.test(trimmed)) {
    return true;
  }

  if (/\b[A-Za-z_]+\/[A-Za-z_]+\b/.test(trimmed)) {
    return true;
  }

  if (/[+-]\d{2}:?\d{2}(?!\d)/.test(trimmed)) {
    return true;
  }

  if (/\dZ$/.test(trimmed)) {
    return true;
  }

  return false;
}

function normalizeNativeInput(input: string): string {
  let normalized = input.trim();
  normalized = normalized.replace(
    /(\d),(\d{3,9})(?!\d)/g,
    (_full, left: string, right: string) => `${left}.${right.slice(0, 3)}`,
  );
  normalized = normalized.replace(/\.(\d{3})\d+/g, ".$1");
  normalized = normalized.replace(/\s+/g, " ");
  return normalized;
}

function parseWithNativeDate(input: string, sourceZone: ZoneSpec): Date | null {
  const explicitTimeZone = hasExplicitTimeZone(input);
  const sourceIsLocal = sourceZone.kind === "iana" && sourceZone.name === localTimeZone();

  if (!explicitTimeZone && !sourceIsLocal) {
    return null;
  }

  const timestamp = Date.parse(normalizeNativeInput(input));
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return new Date(timestamp);
}

function detectState(input: string): ParseState {
  const value = input.trim();
  if (!value) {
    return ParseState.Unknown;
  }

  if (/^\d/.test(value)) {
    if (/^\d+$/.test(value)) {
      return ParseState.Digit;
    }

    if (value.includes("-")) {
      return ParseState.DigitDash;
    }

    if (value.includes("/")) {
      return ParseState.DigitSlash;
    }

    if (/[A-Za-z\u4E00-\u9FFF]/.test(value)) {
      return ParseState.DigitAlpha;
    }

    return ParseState.Digit;
  }

  if (/^[A-Za-z]/.test(value)) {
    return ParseState.Alpha;
  }

  return ParseState.Unknown;
}

function splitInputAndZone(rawInput: string, defaultSourceZone: ZoneSpec): { input: string; sourceZone: ZoneSpec } {
  const trimmed = rawInput.trim();
  const commaIndex = trimmed.lastIndexOf(",");
  if (commaIndex <= 0) {
    return { input: trimmed, sourceZone: defaultSourceZone };
  }

  const left = trimmed.slice(0, commaIndex).trim();
  const right = trimmed.slice(commaIndex + 1).trim();
  const zone = parseZone(right);

  if (!zone) {
    return { input: trimmed, sourceZone: defaultSourceZone };
  }

  return { input: left, sourceZone: zone };
}

function parserPipeline(state: ParseState): ParseWithLabel[] {
  const common: ParseWithLabel[] = [
    { label: "now", parser: (input) => parseNow(input) },
    { label: "ago", parser: (input) => parseAgo(input) },
  ];

  if (state === ParseState.Digit) {
    return [...common, { label: "numeric", parser: parseNumeric }, { label: "native", parser: parseWithNativeDate }];
  }

  if (state === ParseState.DigitDash) {
    return [
      ...common,
      { label: "dash", parser: parseDashDate },
      { label: "chinese", parser: parseChineseDate },
      { label: "native", parser: parseWithNativeDate },
    ];
  }

  if (state === ParseState.DigitSlash) {
    return [...common, { label: "slash", parser: parseSlashDate }, { label: "native", parser: parseWithNativeDate }];
  }

  if (state === ParseState.DigitAlpha) {
    return [
      ...common,
      { label: "chinese", parser: parseChineseDate },
      { label: "day-month-name", parser: parseDayMonthName },
      { label: "native", parser: parseWithNativeDate },
    ];
  }

  if (state === ParseState.Alpha) {
    return [
      ...common,
      { label: "month-name", parser: parseMonthNameDate },
      { label: "ansi", parser: parseAnsiStyle },
      { label: "native", parser: parseWithNativeDate },
    ];
  }

  return [
    ...common,
    { label: "numeric", parser: parseNumeric },
    { label: "dash", parser: parseDashDate },
    { label: "slash", parser: parseSlashDate },
    { label: "chinese", parser: parseChineseDate },
    { label: "native", parser: parseWithNativeDate },
  ];
}

export function parseDateInput(rawInput: string, defaultSourceZone: ZoneSpec): ParseResult {
  const { input, sourceZone } = splitInputAndZone(rawInput, defaultSourceZone);

  if (!input) {
    return {
      ok: false,
      input,
      sourceZone,
      sourceZoneLabel: zoneDisplayName(sourceZone),
      error: "Please enter a time value, e.g. now or 2019-01-30 21:24:44,gmt-7",
    };
  }

  const state = detectState(input);
  const parsers = parserPipeline(state);

  for (const entry of parsers) {
    const parsed = entry.parser(input, sourceZone);
    if (!parsed || Number.isNaN(parsed.getTime())) {
      continue;
    }

    return {
      ok: true,
      input,
      sourceZone,
      sourceZoneLabel: zoneDisplayName(sourceZone),
      date: parsed,
      matchedPattern: entry.label,
    };
  }

  return {
    ok: false,
    input,
    sourceZone,
    sourceZoneLabel: zoneDisplayName(sourceZone),
    error: `Could not find date format for ${input}`,
  };
}
