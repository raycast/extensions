import { toLatinDigits, toPersianDigits } from "./persian";

const ONES = ["", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه"];
const TEENS = ["ده", "یازده", "دوازده", "سیزده", "چهارده", "پانزده", "شانزده", "هفده", "هجده", "نوزده"];
const TENS = ["", "", "بیست", "سی", "چهل", "پنجاه", "شصت", "هفتاد", "هشتاد", "نود"];
const HUNDREDS = ["", "صد", "دویست", "سیصد", "چهارصد", "پانصد", "ششصد", "هفتصد", "هشتصد", "نهصد"];
const SCALES = ["", "هزار", "میلیون", "میلیارد", "تریلیون", "کوادریلیون"];
const FRACTIONS = ["", "دهم", "صدم", "هزارم", "ده‌هزارم", "صدهزارم", "میلیونیم"];

function belowThousand(n: number): string {
  const parts: string[] = [];
  if (n >= 100) parts.push(HUNDREDS[Math.floor(n / 100)]);
  const rest = n % 100;
  if (rest >= 20) {
    parts.push(TENS[Math.floor(rest / 10)]);
    if (rest % 10) parts.push(ONES[rest % 10]);
  } else if (rest >= 10) parts.push(TEENS[rest - 10]);
  else if (rest) parts.push(ONES[rest]);
  return parts.join(" و ");
}

function integerToWords(digits: string): string | null {
  const trimmed = digits.replace(/^0+(?=\d)/, "");
  if (/^0+$/.test(trimmed)) return "صفر";
  const groups: number[] = [];
  for (let end = trimmed.length; end > 0; end -= 3) groups.unshift(Number(trimmed.slice(Math.max(0, end - 3), end)));
  if (groups.length > SCALES.length) return null;
  return groups
    .map((group, i) => {
      if (!group) return "";
      const scale = SCALES[groups.length - 1 - i];
      if (scale === "هزار" && group === 1) return "هزار";
      return scale ? `${belowThousand(group)} ${scale}` : belowThousand(group);
    })
    .filter(Boolean)
    .join(" و ");
}

/** Parses a number written with Latin, Persian or Arabic digits and optional thousands separators. */
export function parseNumber(text: string): { negative: boolean; integer: string; fraction: string } | null {
  const s = toLatinDigits(text.trim())
    .replace(/[,،٬\s]/g, "")
    .replace("٫", ".");
  const match = s.match(/^([-+−]?)(\d+)(?:\.(\d+))?$/);
  if (!match) return null;
  return { negative: match[1] === "-" || match[1] === "−", integer: match[2], fraction: match[3] ?? "" };
}

/** ۱۲۵ → صد و بیست و پنج, 2.5 → دو و پنج دهم. */
export function numberToWords(text: string): string | null {
  const n = parseNumber(text);
  if (!n) return null;
  const integerWords = integerToWords(n.integer);
  if (integerWords == null) return null;
  let words = integerWords;
  if (n.fraction && /[1-9]/.test(n.fraction)) {
    const fraction = n.fraction.replace(/0+$/, "");
    if (fraction.length >= FRACTIONS.length) return null;
    const fractionWords = integerToWords(fraction);
    if (fractionWords == null) return null;
    const named = `${fractionWords} ${FRACTIONS[fraction.length]}`;
    words = n.integer.replace(/0/g, "") ? `${words} و ${named}` : named;
  }
  return n.negative ? `منفی ${words}` : words;
}

/** 1234567 → 1,234,567 (or ۱٬۲۳۴٬۵۶۷). */
export function groupDigits(text: string, persian: boolean): string | null {
  const n = parseNumber(text);
  if (!n) return null;
  const grouped = n.integer.replace(/\B(?=(\d{3})+(?!\d))/g, persian ? "٬" : ",");
  const full = (n.negative ? "-" : "") + grouped + (n.fraction ? (persian ? "٫" : ".") + n.fraction : "");
  return persian ? toPersianDigits(full) : full;
}

// MARK: - Dates

export interface SimpleDate {
  year: number;
  month: number;
  day: number;
}

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
const DAY_MS = 86_400_000;

const jalaliParts = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

function utc(d: SimpleDate): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

export function toJalali(date: SimpleDate): SimpleDate {
  const parts = Object.fromEntries(jalaliParts.formatToParts(utc(date)).map((p) => [p.type, p.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

/** Finds the Gregorian date for a Jalali one by stepping towards it with the system's Persian calendar. */
export function toGregorian(jalali: SimpleDate): SimpleDate | null {
  if (jalali.month < 1 || jalali.month > 12 || jalali.day < 1 || jalali.day > (jalali.month <= 6 ? 31 : 30))
    return null;
  const ordinal = (d: SimpleDate) => d.year * 372 + (d.month - 1) * 31 + d.day;
  let guess = Date.UTC(jalali.year + 621, 2, 21) + ((jalali.month - 1) * 30.6 + jalali.day - 1) * DAY_MS;
  for (let i = 0; i < 12; i++) {
    const g = new Date(guess);
    const candidate = { year: g.getUTCFullYear(), month: g.getUTCMonth() + 1, day: g.getUTCDate() };
    const j = toJalali(candidate);
    const diff = ordinal(jalali) - ordinal(j);
    if (diff === 0) return candidate;
    guess += Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff) * 0.98)) * DAY_MS;
  }
  return null;
}

export function formatJalali(d: SimpleDate, persian = true): string {
  const text = `${d.day} ${JALALI_MONTHS[d.month - 1]} ${d.year}`;
  return persian ? toPersianDigits(text) : text;
}

export function formatNumericDate(d: SimpleDate, persian = false): string {
  const text = `${d.year}/${String(d.month).padStart(2, "0")}/${String(d.day).padStart(2, "0")}`;
  return persian ? toPersianDigits(text) : text;
}

export function formatGregorian(d: SimpleDate): string {
  return utc(d).toLocaleDateString("en-US", { dateStyle: "full", timeZone: "UTC" });
}

export function weekdayFa(d: SimpleDate): string {
  return utc(d).toLocaleDateString("fa-IR", { weekday: "long", timeZone: "UTC" });
}

function daysInGregorianMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function daysInJalaliMonth(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return toGregorian({ year, month: 12, day: 30 }) ? 30 : 29;
}

/** Reads 1405/08/06, ۱۴۰۵-۸-۶ or 2026-10-28. Years below 1700 are taken as Jalali. */
export function parseDate(text: string): { date: SimpleDate; calendar: "jalali" | "gregorian" } | null {
  const match = toLatinDigits(text.trim()).match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (date.month < 1 || date.month > 12 || date.day < 1) return null;
  const calendar = date.year < 1700 ? "jalali" : "gregorian";
  const lastDay =
    calendar === "jalali" ? daysInJalaliMonth(date.year, date.month) : daysInGregorianMonth(date.year, date.month);
  if (date.day > lastDay) return null;
  return { date, calendar };
}

export function today(): SimpleDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}
