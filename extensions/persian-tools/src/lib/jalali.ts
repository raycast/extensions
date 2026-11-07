import { isLeapJalaaliYear, jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";

// Digit & bidi normalization table (reusing digits logic + yeh/kaf)
const NORMALIZE_TABLE = new Map<number, string | null>();
for (let i = 0; i < 10; i++) {
  NORMALIZE_TABLE.set(0x06f0 + i, String(i)); // Persian ۰–۹
  NORMALIZE_TABLE.set(0x0660 + i, String(i)); // Arabic-Indic ٠–٩
}
NORMALIZE_TABLE.set(0x066b, "."); // ٫ decimal separator
NORMALIZE_TABLE.set(0x066c, ","); // ٬ thousands separator
NORMALIZE_TABLE.set(0x064a, "ی"); // Arabic yeh ي
NORMALIZE_TABLE.set(0x0649, "ی"); // alef maksura ى
NORMALIZE_TABLE.set(0x0643, "ک"); // Arabic kaf ك

const BIDI_MARKS = [0x200e, 0x200f, 0x061c, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069];

for (const cp of BIDI_MARKS) {
  NORMALIZE_TABLE.set(cp, null);
}

export const FA_WEEKDAYS: Record<number, string> = {
  0: "دوشنبه",
  1: "سه‌شنبه",
  2: "چهارشنبه",
  3: "پنجشنبه",
  4: "جمعه",
  5: "شنبه",
  6: "یکشنبه",
};

export const FA_MONTHS: Record<number, string> = {
  1: "فروردین",
  2: "اردیبهشت",
  3: "خرداد",
  4: "تیر",
  5: "مرداد",
  6: "شهریور",
  7: "مهر",
  8: "آبان",
  9: "آذر",
  10: "دی",
  11: "بهمن",
  12: "اسفند",
};

export const EN_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export class InvalidDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDateError";
    Object.setPrototypeOf(this, InvalidDateError.prototype);
  }
}

export function normalize(text: string): string {
  let result = "";
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp !== undefined && NORMALIZE_TABLE.has(cp)) {
      const mapped = NORMALIZE_TABLE.get(cp);
      if (mapped !== null && mapped !== undefined) {
        result += mapped;
      }
    } else {
      result += char;
    }
  }
  return result.trim();
}

export function toFaDigits(val: number | string): string {
  return String(val).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

function daysBetween(target: Date, today: Date): number {
  const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((utcTarget - utcToday) / msPerDay);
}

export function formatRelative(target: Date, today: Date): string {
  const delta = daysBetween(target, today);
  if (delta === 0) {
    return "Today";
  }
  if (delta > 0) {
    if (delta >= 14) {
      const w = Math.floor(delta / 7);
      const d = delta % 7;
      const wStr = w === 1 ? `${w} week` : `${w} weeks`;
      if (d > 0) {
        const dStr = d === 1 ? ` ${d} day` : ` ${d} days`;
        return `in ${delta} days (${wStr}${dStr})`;
      }
      return `in ${delta} days (${wStr})`;
    }
    return delta !== 1 ? `in ${delta} days` : "in 1 day";
  } else {
    const absD = Math.abs(delta);
    if (absD >= 14) {
      const w = Math.floor(absD / 7);
      const d = absD % 7;
      const wStr = w === 1 ? `${w} week` : `${w} weeks`;
      if (d > 0) {
        const dStr = d === 1 ? ` ${d} day` : ` ${d} days`;
        return `${absD} days ago (${wStr}${dStr})`;
      }
      return `${absD} days ago (${wStr})`;
    }
    return absD !== 1 ? `${absD} days ago` : "1 day ago";
  }
}

export type MonthMatch =
  | (["jalali" | "gregorian", number] & {
      type: "jalali" | "gregorian";
      month: number;
    })
  | null;

function makeMonthMatch(type: "jalali" | "gregorian", month: number): MonthMatch {
  const match = [type, month] as ["jalali" | "gregorian", number] & {
    type: "jalali" | "gregorian";
    month: number;
  };
  match.type = type;
  match.month = month;
  return match;
}

export function matchMonth(token: string): MonthMatch {
  const t = token.toLowerCase().trim();
  const faMonthsMap: Record<string, number> = {
    فروردین: 1,
    اردیبهشت: 2,
    خرداد: 3,
    تیر: 4,
    مرداد: 5,
    امرداد: 5,
    شهریور: 6,
    مهر: 7,
    آبان: 8,
    ابان: 8,
    آذر: 9,
    اذر: 9,
    دی: 10,
    بهمن: 11,
    اسفند: 12,
  };
  if (t in faMonthsMap) {
    return makeMonthMatch("jalali", faMonthsMap[t]);
  }

  const jalaliLatin: [number, string[]][] = [
    [1, ["farvardin"]],
    [2, ["ordibehesht"]],
    [3, ["khordad"]],
    [4, ["tir"]],
    [5, ["mordad", "amordad"]],
    [6, ["shahrivar"]],
    [7, ["mehr"]],
    [8, ["aban"]],
    [9, ["azar"]],
    [10, ["dey", "dei"]],
    [11, ["bahman"]],
    [12, ["esfand"]],
  ];
  if (t.length >= 3) {
    for (const [mNum, names] of jalaliLatin) {
      for (const name of names) {
        if (name.startsWith(t)) {
          return makeMonthMatch("jalali", mNum);
        }
      }
    }
  }

  const gregNames: [number, string[]][] = [
    [1, ["january", "jan"]],
    [2, ["february", "feb"]],
    [3, ["march", "mar"]],
    [4, ["april", "apr"]],
    [5, ["may"]],
    [6, ["june", "jun"]],
    [7, ["july", "jul"]],
    [8, ["august", "aug"]],
    [9, ["september", "sep", "sept"]],
    [10, ["october", "oct"]],
    [11, ["november", "nov"]],
    [12, ["december", "dec"]],
  ];
  for (const [mNum, names] of gregNames) {
    for (const name of names) {
      if (t === name || (t.length >= 3 && name.startsWith(t))) {
        return makeMonthMatch("gregorian", mNum);
      }
    }
  }

  return null;
}

function createValidGregorianDate(y: number, m: number, d: number): Date {
  if (m < 1 || m > 12) {
    throw new InvalidDateError("month must be in 1..12");
  }
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new InvalidDateError("day is out of range for month");
  }
  return date;
}

export function parseDate(rawText?: string, today: Date = new Date()): Date | null {
  const text = normalize(rawText ?? "");
  if (!text) {
    return today;
  }

  // Relative offset: +N, -N, +Nw, -Nw
  const mRel = text.match(/^([+-]\d+)\s*(d|day|days|w|week|weeks)?$/i);
  if (mRel) {
    const num = parseInt(mRel[1], 10);
    const unit = (mRel[2] || "d").toLowerCase();
    const days = unit.startsWith("w") ? num * 7 : num;
    if (Math.abs(days) > 10000000) {
      throw new InvalidDateError("Offset is too large");
    }
    const result = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    if (isNaN(result.getTime())) {
      throw new InvalidDateError("Offset is too large");
    }
    return result;
  }

  // Numeric dates with /, - or . separators: Y/M/D
  const mNum = text.match(/^(\d{3,4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (mNum) {
    const y = parseInt(mNum[1], 10);
    const m = parseInt(mNum[2], 10);
    const d = parseInt(mNum[3], 10);
    if (y < 1700) {
      if (!(y >= 1 && y <= 3177)) {
        throw new InvalidDateError(`Year ${y} outside valid Jalali range 1–3177`);
      }
      if (!(m >= 1 && m <= 12)) {
        throw new InvalidDateError(`Month ${m} must be 1 to 12`);
      }
      const maxD = jalaaliMonthLength(y, m);
      if (!(d >= 1 && d <= maxD)) {
        if (m === 12 && d === 30 && !isLeapJalaaliYear(y)) {
          throw new InvalidDateError(`${y} is not a leap year (Esfand has 29 days)`);
        }
        throw new InvalidDateError(`Day ${d} out of range for month ${m} (max ${maxD})`);
      }
      const { gy, gm, gd } = toGregorian(y, m, d);
      return new Date(gy, gm - 1, gd);
    } else {
      return createValidGregorianDate(y, m, d);
    }
  }

  // Day + Month Name [+ Year], either order
  const tokens = text
    .split(/[\s,]+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/^(\d+)(st|nd|rd|th)$/i, "$1"));

  let monthMatch: MonthMatch = null;
  let monthIdx = -1;
  for (let idx = 0; idx < tokens.length; idx++) {
    const res = matchMonth(tokens[idx]);
    if (res) {
      monthMatch = res;
      monthIdx = idx;
      break;
    }
  }

  if (monthMatch) {
    const calType = monthMatch[0];
    const month = monthMatch[1];
    const numTokens: { idx: number; val: number }[] = [];
    tokens.forEach((tok, idx) => {
      if (idx !== monthIdx && /^\d+$/.test(tok)) {
        numTokens.push({ idx, val: parseInt(tok, 10) });
      }
    });

    let todayJy = today.getFullYear() - 621;
    try {
      todayJy = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate()).jy;
    } catch {
      // fallback
    }
    const currentYear = calType === "jalali" ? todayJy : today.getFullYear();

    let year: number;
    let day: number;

    if (numTokens.length === 1) {
      day = numTokens[0].val;
      year = currentYear;
    } else if (numTokens.length === 2) {
      const n1 = numTokens[0].val;
      const n2 = numTokens[1].val;
      if (n1 > 31 && n2 <= 31) {
        year = n1;
        day = n2;
      } else if (n2 > 31 && n1 <= 31) {
        year = n2;
        day = n1;
      } else {
        if (numTokens[0].idx < monthIdx && monthIdx < numTokens[1].idx) {
          day = n1;
          year = n2;
        } else if (monthIdx < numTokens[0].idx) {
          day = n1;
          year = n2;
        } else {
          year = n1;
          day = n2;
        }
      }
    } else {
      return null;
    }

    if (calType === "jalali") {
      if (!(year >= 1 && year <= 3177)) {
        throw new InvalidDateError(`Year ${year} outside valid Jalali range 1–3177`);
      }
      if (!(month >= 1 && month <= 12)) {
        throw new InvalidDateError(`Month ${month} must be 1 to 12`);
      }
      const maxD = jalaaliMonthLength(year, month);
      if (!(day >= 1 && day <= maxD)) {
        if (month === 12 && day === 30 && !isLeapJalaaliYear(year)) {
          throw new InvalidDateError(`${year} is not a leap year (Esfand has 29 days)`);
        }
        throw new InvalidDateError(`Day ${day} out of range for month ${month} (max ${maxD})`);
      }
      const { gy, gm, gd } = toGregorian(year, month, day);
      return new Date(gy, gm - 1, gd);
    } else {
      return createValidGregorianDate(year, month, day);
    }
  }

  return null;
}

export interface DateRow {
  title: string;
  subtitle: string;
  copy: string;
}

export function buildDateRows(rawQuery?: string, today: Date = new Date()): DateRow[] {
  let resolvedDt: Date | null;
  try {
    resolvedDt = parseDate(rawQuery, today);
  } catch (err) {
    if (err instanceof InvalidDateError || (err instanceof Error && err.name === "InvalidDateError")) {
      return [
        {
          title: "Invalid date",
          subtitle: (err as Error).message,
          copy: "",
        },
      ];
    }
    throw err;
  }

  if (resolvedDt === null) {
    return [
      {
        title: "Type a date: 1405/7/14, 2026-10-06, 14 mehr, +30",
        subtitle: "Supports Jalali and Gregorian dates, relative days/weeks, and month names",
        copy: "",
      },
    ];
  }

  let jy: number;
  let jm: number;
  let jd: number;

  try {
    const jDate = toJalaali(resolvedDt.getFullYear(), resolvedDt.getMonth() + 1, resolvedDt.getDate());
    jy = jDate.jy;
    jm = jDate.jm;
    jd = jDate.jd;
    if (jy < 1 || jy > 3177) {
      throw new RangeError("Outside the supported Jalali range");
    }
  } catch {
    return [
      {
        title: "Invalid date",
        subtitle: "Outside the supported Jalali range",
        copy: "",
      },
    ];
  }

  const relativeStr = formatRelative(resolvedDt, today);
  const weekdayIdx = (resolvedDt.getDay() + 6) % 7;

  // 1. Persian long form with Persian digits: {weekday} {day} {month} {year}
  const faWeekday = FA_WEEKDAYS[weekdayIdx];
  const faDay = toFaDigits(jd);
  const faMonth = FA_MONTHS[jm];
  const faYear = toFaDigits(jy);
  const row1Title = `${faWeekday} ${faDay} ${faMonth} ${faYear}`;

  // 2. Jalali numeric: 1405/07/14
  const row2Title = `${String(jy).padStart(4, "0")}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;

  // 3. Gregorian long: Tuesday, 6 October 2026
  const enWeekday = EN_WEEKDAYS[weekdayIdx];
  const enMonth = EN_MONTHS[resolvedDt.getMonth()];
  const row3Title = `${enWeekday}, ${resolvedDt.getDate()} ${enMonth} ${resolvedDt.getFullYear()}`;

  // 4. Gregorian ISO: 2026-10-06
  const row4Title = `${resolvedDt.getFullYear()}-${String(resolvedDt.getMonth() + 1).padStart(2, "0")}-${String(resolvedDt.getDate()).padStart(2, "0")}`;

  // 5. Relative text
  const row5Title = relativeStr;

  return [
    { title: row1Title, subtitle: relativeStr, copy: row1Title },
    { title: row2Title, subtitle: relativeStr, copy: row2Title },
    { title: row3Title, subtitle: relativeStr, copy: row3Title },
    { title: row4Title, subtitle: relativeStr, copy: row4Title },
    { title: row5Title, subtitle: "Relative", copy: row5Title },
  ];
}
