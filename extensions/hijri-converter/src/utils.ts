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

// Convert Hijri to Gregorian
export function convertHijriToGregorian(hijri: HijriDate): GregorianDate {
  const result = toGregorian(hijri.year, hijri.month, hijri.day);
  return {
    year: result.gy,
    month: result.gm,
    day: result.gd,
  };
}

// Convert Gregorian to Hijri
export function convertGregorianToHijri(gregorian: GregorianDate): HijriDate {
  const result = toHijri(gregorian.year, gregorian.month, gregorian.day);
  return {
    year: result.hy,
    month: result.hm,
    day: result.hd,
  };
}

// Get formatted Hijri date string
export function formatHijriDate(hijri: HijriDate): string {
  const month = HIJRI_MONTHS[hijri.month - 1];
  return `${hijri.day} ${month.name} ${hijri.year} AH`;
}

// Get formatted Gregorian date string
export function formatGregorianDate(gregorian: GregorianDate, includeWeekday = true): string {
  const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);

  if (includeWeekday) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
  return year > 0 && year <= 2000; // Reasonable range
}

// Get day name for a date
export function getDayName(gregorian: GregorianDate): string {
  const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
  const dayIndex = date.getDay();
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
