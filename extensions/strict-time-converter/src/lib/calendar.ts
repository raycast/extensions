import { DateTime, FixedOffsetZone } from "luxon";
import type { ParseResult } from "./time";

export type DateOrder = "auto" | "MDY" | "DMY";

const DATE_INPUT =
  /^(\d{4})([-/.])(\d{1,2})\2(\d{1,2})(?:[Tt\s]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?(?:\s*([AP]M))?(?:\s*([Zz]|[+-]\d{2}:?\d{2}))?)?$/i;
const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const WEEKDAY_NAMES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

type Normalized = { text: string; format: string; weekday?: number };
type Failure = { ok: false; error: string };

function invalidDate(): Failure {
  return {
    ok: false,
    error: "Invalid date. Check the month, day, time, and leap year.",
  };
}

function namedIndex(
  name: string,
  shortNames: string[],
  fullNames: string[],
): number {
  const lower = name.toLowerCase();
  const shortIndex = shortNames.indexOf(lower);
  return (shortIndex >= 0 ? shortIndex : fullNames.indexOf(lower)) + 1;
}

function normalizeCalendar(
  input: string,
  order: DateOrder,
): Normalized | Failure {
  let text = input;
  let format = "Date and Time";
  let weekday: number | undefined;
  const prefix = text.match(/^(date|us|eu):\s*(.*)$/i);
  if (prefix) {
    text = prefix[2].trim();
    if (prefix[1].toLowerCase() === "us") order = "MDY";
    if (prefix[1].toLowerCase() === "eu") order = "DMY";
  }

  // A bare 8-digit number remains Unix seconds. Use date:YYYYMMDD explicitly.
  const compact = text.match(
    /^(\d{4})(\d{2})(\d{2})(?:[Tt]?(\d{2})(\d{2})(\d{2})(?:[.,](\d{1,3}))?([Zz]|[+-]\d{2}:?\d{2})?)?$/,
  );
  if (compact && (prefix || compact[4])) {
    const [, year, month, day, hour, minute, second, fraction, offset = ""] =
      compact;
    text = `${year}-${month}-${day}${hour ? `T${hour}:${minute}:${second}${fraction ? `.${fraction}` : ""}${offset}` : ""}`;
    format = "Compact Date / ISO Basic";
  }

  const alternativeISO = text.match(/^(\d{4}-(?:W\d{2}-\d|\d{3}))([Tt\s].*)?$/);
  if (alternativeISO) {
    const date = DateTime.fromISO(alternativeISO[1], { zone: "UTC" });
    if (!date.isValid) return invalidDate();
    text = `${date.toISODate()}${alternativeISO[2] ?? ""}`;
    format = alternativeISO[1].includes("W")
      ? "ISO Week Date"
      : "ISO Ordinal Date";
  }

  if (/年|月|日|号|上午|下午/.test(text)) {
    text = text.replace(
      /(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})[日号]/,
      "$1-$2-$3 ",
    );
    text = text.replace(
      /(\d{1,2})[点时](?:(\d{1,2})分)?(?:(\d{1,2})(?:[.,](\d{1,3}))?秒)?/,
      (_, h, m = "0", s = "0", ms = "") =>
        `${h}:${m.padStart(2, "0")}:${s.padStart(2, "0")}${ms ? `.${ms}` : ""}`,
    );
    const period = text.match(/上午|下午/);
    if (period) {
      const clock = text.replace(/上午|下午/, "").trim();
      const offset = clock.match(/\s*(Z|[+-]\d{2}:?\d{2}|UTC|GMT)$/i);
      const calendar = offset ? clock.slice(0, offset.index).trim() : clock;
      text = `${calendar} ${period[0] === "上午" ? "AM" : "PM"}${offset ? ` ${offset[1]}` : ""}`;
    }
    text = text.trim();
    format = "Chinese Date";
  }

  // Named abbreviations such as CST can mean several different time zones.
  if (/\b(?:CST|IST|BST|PST|PDT|EST|EDT|MST|MDT|CDT|CEST|CET)$/i.test(text)) {
    return {
      ok: false,
      error:
        "Time-zone abbreviations can be ambiguous. Use +08:00, -05:00, UTC, or GMT.",
    };
  }
  const wasHTTP = /\sGMT$/i.test(text);
  text = text.replace(/\s+GMT([+-]\d{2}:?\d{2})(?:\s+\([^)]*\))?$/i, "$1");
  text = text.replace(/\s+(UTC|GMT)$/i, "Z");

  // ctime / asctime: Thu Oct 15 12:00:00 2026.
  const ctime = text.match(
    /^([A-Za-z]+)\s+([A-Za-z]+)\s+(\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d{4})$/,
  );
  if (ctime) {
    const [, dayName, monthName, day, time, year] = ctime;
    const month = namedIndex(monthName, MONTHS, MONTH_NAMES);
    weekday = namedIndex(dayName, WEEKDAYS, WEEKDAY_NAMES);
    if (!month || !weekday) return invalidDate();
    text = `${year}-${month}-${day} ${time}`;
    format = "ctime / asctime";
  } else {
    const monthFirst = text.match(
      /^(?:([A-Za-z]+),?\s+)?([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(.*)$/,
    );
    const dayFirst = text.match(
      /^(?:([A-Za-z]+),?\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(.*)$/,
    );
    const english = monthFirst ?? dayFirst;
    if (english) {
      const [, dayName, a, b, year, time] = english;
      const month = namedIndex(monthFirst ? a : b, MONTHS, MONTH_NAMES);
      const day = monthFirst ? b : a;
      if (dayName) weekday = namedIndex(dayName, WEEKDAYS, WEEKDAY_NAMES);
      if (!month || (dayName && !weekday)) return invalidDate();
      text = `${year}-${month}-${day}${time}`;
      format = wasHTTP
        ? "HTTP / RFC 1123"
        : /[+-]\d{2}:?\d{2}$/.test(time)
          ? "RFC 2822 / English Date"
          : "English Month Date";
    }
  }

  const yearLast = text.match(/^(\d{1,2})([-/.])(\d{1,2})\2(\d{4})(.*)$/);
  if (yearLast) {
    const [, a, , b, year, time] = yearLast;
    const first = Number(a);
    const second = Number(b);
    let resolvedOrder = order;
    if (order === "auto") {
      if (first > 12) resolvedOrder = "DMY";
      else if (second > 12) resolvedOrder = "MDY";
      else if (first === second) resolvedOrder = "DMY";
      else
        return {
          ok: false,
          error:
            "Ambiguous month/day order. Use us: for month/day/year, eu: for day/month/year, or set Date Order in preferences.",
        };
    }
    const [month, day] = resolvedOrder === "MDY" ? [a, b] : [b, a];
    text = `${year}-${month}-${day}${time}`;
    format =
      resolvedOrder === "MDY"
        ? "US Date · Month/Day/Year"
        : "European Date · Day/Month/Year";
  }

  if (format === "Date and Time" && /[Tt]/.test(text))
    format = "ISO 8601 / RFC 3339";
  return { text, format, weekday };
}

export function parseCalendarInput(
  input: string,
  timezone: string,
  order: DateOrder = "auto",
): ParseResult {
  const normalized = normalizeCalendar(input, order);
  if ("ok" in normalized) return normalized;
  const match = normalized.text.match(DATE_INPUT);
  if (!match) {
    return {
      ok: false,
      error:
        "Use Unix seconds or milliseconds, ISO, SQL, Chinese or English dates, or RFC/HTTP dates. Use date:20261015 for a compact date. See ⌘K for examples.",
    };
  }
  const [
    ,
    year,
    ,
    month,
    day,
    hour = "0",
    minute = "0",
    second = "0",
    fraction = "",
    period,
    offset,
  ] = match;
  const rawHour = Number(hour);
  if ((period && (rawHour < 1 || rawHour > 12)) || (!period && rawHour > 23)) {
    return {
      ok: false,
      error: period
        ? "The hour must be between 1 and 12 when using AM or PM."
        : "The hour must be between 00 and 23.",
    };
  }
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: period
      ? (rawHour % 12) + (period.toUpperCase() === "PM" ? 12 : 0)
      : rawHour,
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(fraction.padEnd(3, "0")),
  };
  let zone: string | FixedOffsetZone = timezone;
  if (offset) {
    if (offset.toUpperCase() === "Z") zone = "UTC";
    else {
      const digits = offset.slice(1).replace(":", "");
      const h = Number(digits.slice(0, 2));
      const m = Number(digits.slice(2));
      if (h > 23 || m > 59)
        return {
          ok: false,
          error: "Invalid time-zone offset. Use Z or an offset such as +08:00.",
        };
      zone = FixedOffsetZone.instance(
        (offset.startsWith("-") ? -1 : 1) * (h * 60 + m),
      );
    }
  }
  const date = DateTime.fromObject(parts, { zone });
  if (!date.isValid) return invalidDate();
  // Reject silent normalization of nonexistent dates and daylight-saving gaps.
  if (
    Object.entries(parts).some(
      ([key, value]) => date.get(key as keyof typeof parts) !== value,
    )
  ) {
    return {
      ok: false,
      error:
        "This local time does not exist during a daylight-saving transition. Add an explicit UTC offset.",
    };
  }
  if (!offset && date.getPossibleOffsets().length > 1) {
    return {
      ok: false,
      error:
        "This local time occurs twice when daylight saving ends. Add an explicit UTC offset, such as -04:00 or -05:00.",
    };
  }
  if (normalized.weekday !== undefined && normalized.weekday !== date.weekday) {
    return {
      ok: false,
      error:
        "The date does not match the supplied weekday. Check the date or weekday.",
    };
  }
  return {
    ok: true,
    milliseconds: date.toMillis(),
    source: "date",
    inputFormat: normalized.format,
  };
}
