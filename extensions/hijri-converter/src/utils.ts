import { toGregorian, toHijri } from "hijri-converter";

// Hijri month names
export const HIJRI_MONTHS = [
  { value: "1", name: "Muharram" },
  { value: "2", name: "Safar" },
  { value: "3", name: "Rabi al-Awwal" },
  { value: "4", name: "Rabi al-Thani" },
  { value: "5", name: "Jumada al-Awwal" },
  { value: "6", name: "Jumada al-Thani" },
  { value: "7", name: "Rajab" },
  { value: "8", name: "Shaban" },
  { value: "9", name: "Ramadan" },
  { value: "10", name: "Shawwal" },
  { value: "11", name: "Dhu al-Qidah" },
  { value: "12", name: "Dhu al-Hijjah" },
];

// Gregorian month names
export const GREGORIAN_MONTHS = [
  { value: "1", name: "January" },
  { value: "2", name: "February" },
  { value: "3", name: "March" },
  { value: "4", name: "April" },
  { value: "5", name: "May" },
  { value: "6", name: "June" },
  { value: "7", name: "July" },
  { value: "8", name: "August" },
  { value: "9", name: "September" },
  { value: "10", name: "October" },
  { value: "11", name: "November" },
  { value: "12", name: "December" },
];

// Day names
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

export interface GregorianDate {
  year: number;
  month: number;
  day: number;
}

const ISLAMIC_EPOCH = 1948439; // Julian day number for 1 Muharram 1 AH

function isSafeInteger(value: number): boolean {
  return Number.isInteger(value) && Number.isSafeInteger(value);
}

function isGregorianLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function getGregorianDaysInMonth(year: number, month: number): number {
  if (month === 2) return isGregorianLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function gregorianToJdn(gregorian: GregorianDate): number {
  const a = Math.floor((14 - gregorian.month) / 12);
  const y = gregorian.year + 4800 - a;
  const m = gregorian.month + 12 * a - 3;
  return (
    gregorian.day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToGregorian(jdn: number): GregorianDate {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function hijriToJdnCivil(hijri: HijriDate): number {
  const monthDays = Math.ceil(29.5 * (hijri.month - 1));
  const yearDays = (hijri.year - 1) * 354 + Math.floor((3 + 11 * hijri.year) / 30);
  return hijri.day + monthDays + yearDays + ISLAMIC_EPOCH - 1;
}

function jdnToHijriCivil(jdn: number): HijriDate {
  const year = Math.floor((30 * (jdn - ISLAMIC_EPOCH) + 10646) / 10631);
  const firstDayOfYear = hijriToJdnCivil({ year, month: 1, day: 1 });
  const month = Math.min(12, Math.ceil((jdn - 29 - firstDayOfYear) / 29.5) + 1);
  const day = jdn - hijriToJdnCivil({ year, month, day: 1 }) + 1;
  return { year, month, day };
}

function isValidHijriResult(result: { hy: number; hm: number; hd: number }): boolean {
  return (
    Number.isFinite(result.hy) &&
    Number.isFinite(result.hm) &&
    Number.isFinite(result.hd) &&
    result.hm >= 1 &&
    result.hm <= 12 &&
    result.hd >= 1 &&
    result.hd <= 30
  );
}

function isValidGregorianResult(result: { gy: number; gm: number; gd: number }): boolean {
  return isValidGregorianDate({ year: result.gy, month: result.gm, day: result.gd });
}

// Convert Hijri to Gregorian
export function convertHijriToGregorian(hijri: HijriDate): GregorianDate {
  const result = toGregorian(hijri.year, hijri.month, hijri.day);
  if (isValidGregorianResult(result)) {
    return { year: result.gy, month: result.gm, day: result.gd };
  }

  return jdnToGregorian(hijriToJdnCivil(hijri));
}

// Convert Gregorian to Hijri
export function convertGregorianToHijri(gregorian: GregorianDate): HijriDate {
  const result = toHijri(gregorian.year, gregorian.month, gregorian.day);
  if (isValidHijriResult(result)) {
    return { year: result.hy, month: result.hm, day: result.hd };
  }

  return jdnToHijriCivil(gregorianToJdn(gregorian));
}

// Get formatted Hijri date string
export function formatHijriDate(hijri: HijriDate): string {
  const month = HIJRI_MONTHS[hijri.month - 1];
  return `${hijri.day} ${month.name} ${hijri.year} AH`;
}

// Get formatted Gregorian date string
export function formatGregorianDate(gregorian: GregorianDate, includeWeekday = true): string {
  const monthName = GREGORIAN_MONTHS[gregorian.month - 1]?.name ?? "Unknown";
  const dateLabel = `${monthName} ${gregorian.day}, ${gregorian.year}`;
  if (!includeWeekday) return dateLabel;
  return `${getDayName(gregorian)}, ${dateLabel}`;
}

// Get short formatted Gregorian date
export function formatGregorianDateShort(gregorian: GregorianDate): string {
  return `${gregorian.year}-${String(gregorian.month).padStart(2, "0")}-${String(gregorian.day).padStart(2, "0")}`;
}

// Get short formatted Hijri date
export function formatHijriDateShort(hijri: HijriDate): string {
  return `${hijri.year}-${String(hijri.month).padStart(2, "0")}-${String(hijri.day).padStart(2, "0")} AH`;
}

// Get today's Hijri date
export function getTodayHijri(): HijriDate {
  const today = new Date();
  return convertGregorianToHijri({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  });
}

// Get today's Gregorian date
export function getTodayGregorian(): GregorianDate {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

// Validation helpers
export function isValidHijriDay(day: number, month: number): boolean {
  if (day < 1) return false;
  // Odd months have 30 days, even months have 29 days (Dhu al-Hijjah can have 30 in leap years)
  const maxDays = month % 2 === 1 ? 30 : 29;
  return day <= maxDays || (month === 12 && day === 30);
}

export function isValidHijriMonth(month: number): boolean {
  return month >= 1 && month <= 12;
}

export function isValidHijriYear(year: number): boolean {
  return isSafeInteger(year) && year >= 1;
}

export function isValidGregorianDate(gregorian: GregorianDate): boolean {
  if (!isSafeInteger(gregorian.year) || gregorian.year < 1) return false;
  if (!isSafeInteger(gregorian.month) || gregorian.month < 1 || gregorian.month > 12) return false;
  if (!isSafeInteger(gregorian.day) || gregorian.day < 1) return false;
  return gregorian.day <= getGregorianDaysInMonth(gregorian.year, gregorian.month);
}

export function validateHijriDate(hijri: HijriDate): string | null {
  if (!isValidHijriYear(hijri.year)) return "Year must be 1 or later";
  if (!isValidHijriMonth(hijri.month)) return "Month must be between 1 and 12";
  if (!isValidHijriDay(hijri.day, hijri.month)) return "Day is out of range for this Hijri month";
  return null;
}

export function validateGregorianDate(gregorian: GregorianDate): string | null {
  if (gregorian.year < 1) return "Year must be 1 or later";
  if (gregorian.month < 1 || gregorian.month > 12) return "Month must be between 1 and 12";
  if (gregorian.day < 1) return "Day must be greater than 0";
  if (!isValidGregorianDate(gregorian)) return "Day is out of range for this month";
  return null;
}

// Get day name for a date
export function getDayName(gregorian: GregorianDate): string {
  const jdn = gregorianToJdn(gregorian);
  const dayIndex = (jdn + 1) % 7;
  return DAY_NAMES[dayIndex];
}

// Get Hijri month name
export function getHijriMonthName(month: number): string {
  return HIJRI_MONTHS[month - 1].name;
}

// Get Hijri date for a specific day offset from today
export function getHijriDateWithOffset(daysOffset: number): HijriDate {
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysOffset);

  return convertGregorianToHijri({
    year: targetDate.getFullYear(),
    month: targetDate.getMonth() + 1,
    day: targetDate.getDate(),
  });
}
