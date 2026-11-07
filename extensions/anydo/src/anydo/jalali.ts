import { toGregorian, toJalaali } from "jalaali-js";

export const JALALI_MONTHS = [
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
] as const;

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** ۱۲۳ / ١٢٣ → 123 */
export function toAsciiDigits(input: string): string {
  return input.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (char) =>
    String(char.charCodeAt(0) & 0xf),
  );
}

export function toPersianDigits(input: string | number): string {
  return String(input).replace(
    /[0-9]/g,
    (digit) => PERSIAN_DIGITS[Number(digit)],
  );
}

export function jalaaliToDate(year: number, month: number, day: number): Date {
  const { gy, gm, gd } = toGregorian(year, month, day);
  return new Date(gy, gm - 1, gd);
}

export function dateToJalaali(date: Date): {
  jy: number;
  jm: number;
  jd: number;
} {
  return toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** ۱۵ آبان ۱۴۰۵ */
export function formatJalaliDate(date: Date): string {
  const { jy, jm, jd } = dateToJalaali(date);
  return `${toPersianDigits(jd)} ${JALALI_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

/** ۱۵ آبان ۱۴۰۵ – ۱۹:۰۰ (or بدون ساعت when the task has no time) */
export function formatJalaliDateTime(date: Date, includeTime = true): string {
  const label = formatJalaliDate(date);
  if (!includeTime) return label;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${label} – ${toPersianDigits(hours)}:${toPersianDigits(minutes)}`;
}

/** ۱۴۰۵/۰۸/۱۵ */
export function formatJalaliShort(date: Date): string {
  const { jy, jm, jd } = dateToJalaali(date);
  return toPersianDigits(
    `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`,
  );
}
