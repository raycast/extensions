import { toGregorian, toHijri } from "hijri-converter";

// Hijri month names in English and Arabic
export const HIJRI_MONTHS = [
  { value: "1", english: "Muharram", arabic: "محرم" },
  { value: "2", english: "Safar", arabic: "صفر" },
  { value: "3", english: "Rabi' al-Awwal", arabic: "ربيع الأول" },
  { value: "4", english: "Rabi' al-Thani", arabic: "ربيع الثاني" },
  { value: "5", english: "Jumada al-Awwal", arabic: "جمادى الأولى" },
  { value: "6", english: "Jumada al-Thani", arabic: "جمادى الثانية" },
  { value: "7", english: "Rajab", arabic: "رجب" },
  { value: "8", english: "Sha'ban", arabic: "شعبان" },
  { value: "9", english: "Ramadan", arabic: "رمضان" },
  { value: "10", english: "Shawwal", arabic: "شوال" },
  { value: "11", english: "Dhu al-Qi'dah", arabic: "ذو القعدة" },
  { value: "12", english: "Dhu al-Hijjah", arabic: "ذو الحجة" },
];

// Gregorian month names
export const GREGORIAN_MONTHS = [
  { value: "1", english: "January" },
  { value: "2", english: "February" },
  { value: "3", english: "March" },
  { value: "4", english: "April" },
  { value: "5", english: "May" },
  { value: "6", english: "June" },
  { value: "7", english: "July" },
  { value: "8", english: "August" },
  { value: "9", english: "September" },
  { value: "10", english: "October" },
  { value: "11", english: "November" },
  { value: "12", english: "December" },
];

// Day names
export const DAY_NAMES = [
  { english: "Sunday", arabic: "الأحد" },
  { english: "Monday", arabic: "الاثنين" },
  { english: "Tuesday", arabic: "الثلاثاء" },
  { english: "Wednesday", arabic: "الأربعاء" },
  { english: "Thursday", arabic: "الخميس" },
  { english: "Friday", arabic: "الجمعة" },
  { english: "Saturday", arabic: "السبت" },
];

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
export function formatHijriDate(hijri: HijriDate, includeArabic = true): string {
  const month = HIJRI_MONTHS[hijri.month - 1];
  const arabicSuffix = includeArabic ? ` (${month.arabic})` : "";
  return `${hijri.day} ${month.english}${arabicSuffix} ${hijri.year} AH`;
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
export function getDayName(gregorian: GregorianDate): { english: string; arabic: string } {
  const date = new Date(gregorian.year, gregorian.month - 1, gregorian.day);
  const dayIndex = date.getDay();
  return DAY_NAMES[dayIndex];
}

// Get Hijri month name
export function getHijriMonthName(month: number): { english: string; arabic: string } {
  return HIJRI_MONTHS[month - 1];
}
