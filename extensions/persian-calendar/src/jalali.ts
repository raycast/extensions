import { toGregorian, toJalaali, jalaaliMonthLength } from "jalaali-js";

export { toGregorian, toJalaali, jalaaliMonthLength };

export const MONTH_NAMES = [
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

// Weekdays start on Saturday, as in Iranian calendars.
export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const SHORT_WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function englishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function getIranToday() {
  // We derive today's civil date from Iran time, even when the PC is in another timezone.
  const pieces = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const part = (type: string) => Number(pieces.find((piece) => piece.type === type)?.value);
  const gy = part("year");
  const gm = part("month");
  const gd = part("day");
  return { gy, gm, gd, ...toJalaali(gy, gm, gd) };
}

export function weekdayIndex(gy: number, gm: number, gd: number): number {
  // JavaScript: Sunday = 0. Persian calendar: Saturday = 0.
  return (new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay() + 1) % 7;
}

export function gregorianText(gy: number, gm: number, gd: number): string {
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function jalaliText(jy: number, jm: number, jd: number): string {
  return `${faDigits(jy)}/${faDigits(String(jm).padStart(2, "0"))}/${faDigits(String(jd).padStart(2, "0"))}`;
}
