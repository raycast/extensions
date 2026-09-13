/**
 * Nepali Date (Bikram Sambat) Conversion Utility
 *
 * The BS calendar is a solar calendar where month lengths are NOT fixed —
 * they vary year-to-year (29–32 days per month) based on astronomical
 * panchang calculations. There is no simple formula; a lookup table is required.
 *
 * Reference anchor: 1 Baishakh 2000 BS = 14 April 1943 AD
 * Data range: BS 2000–2100 (AD 1943–2043)
 * Source: Nepal Panchanga Nirnayak Samiti (via sonill/nepali-dates)
 */

// ─── Constants ──────────────────────────────────────────────────────────────

export const BS_MONTH_NAMES = [
  "Baishakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export const BS_MONTH_NAMES_NP = [
  "बैशाख",
  "जेठ",
  "असार",
  "श्रावण",
  "भदौ",
  "असोज",
  "कार्तिक",
  "मंसिर",
  "पौष",
  "माघ",
  "फाल्गुन",
  "चैत्र",
] as const;

export const AD_MONTH_NAMES = [
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
] as const;

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_NAMES_NP = [
  "आइतबार",
  "सोमबार",
  "मंगलबार",
  "बुधबार",
  "बिहिबार",
  "शुक्रबार",
  "शनिबार",
] as const;

// Reference point: 1 Baishakh 2000 BS = 14 April 1943 AD
const REF_BS = { year: 2000, month: 1, day: 1 };
const REF_AD = new Date(1943, 3, 14); // April = month index 3

// ─── Lookup Table ───────────────────────────────────────────────────────────
// Each key is a BS year; the value is an array of 12 month-lengths.
// Month order: [Baishakh, Jestha, Ashadh, Shrawan, Bhadra, Ashwin,
//               Kartik, Mangsir, Poush, Magh, Falgun, Chaitra]

const BS_CALENDAR_DATA: Record<number, number[]> = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2082: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2083: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2092: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2093: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2095: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
  2096: [30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2097: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2098: [31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 30, 31],
  2099: [31, 31, 32, 31, 31, 31, 30, 29, 29, 30, 30, 30],
  2100: [31, 32, 31, 32, 30, 31, 30, 29, 30, 29, 30, 30],
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BsDate {
  year: number;
  month: number; // 1-indexed (1 = Baishakh, 12 = Chaitra)
  day: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Get the number of days in a specific BS month. */
export function getBsMonthDays(year: number, month: number): number {
  const data = BS_CALENDAR_DATA[year];
  if (!data)
    throw new Error(`BS year ${year} is out of supported range (2000–2100)`);
  if (month < 1 || month > 12) throw new Error(`Invalid BS month: ${month}`);
  return data[month - 1];
}

/** Get the total number of days in a BS year (sum of all 12 months). */
export function getTotalDaysInBsYear(year: number): number {
  const data = BS_CALENDAR_DATA[year];
  if (!data)
    throw new Error(`BS year ${year} is out of supported range (2000–2100)`);
  return data.reduce((sum, d) => sum + d, 0);
}

/** Get the English name of a BS month (1-indexed). */
export function getBsMonthName(month: number): string {
  if (month < 1 || month > 12) throw new Error(`Invalid BS month: ${month}`);
  return BS_MONTH_NAMES[month - 1];
}

/** Get the Nepali name of a BS month (1-indexed). */
export function getBsMonthNameNp(month: number): string {
  if (month < 1 || month > 12) throw new Error(`Invalid BS month: ${month}`);
  return BS_MONTH_NAMES_NP[month - 1];
}

/** Validate whether a BS date falls within supported range and has valid day. */
export function isValidBsDate(
  year: number,
  month: number,
  day: number,
): boolean {
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  const data = BS_CALENDAR_DATA[year];
  if (!data) return false;
  return day <= data[month - 1];
}

/** Calculate the number of days between a Date and the reference AD date. */
function daysSinceRefAd(date: Date): number {
  const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const utcRef = Date.UTC(
    REF_AD.getFullYear(),
    REF_AD.getMonth(),
    REF_AD.getDate(),
  );
  return Math.floor((utcDate - utcRef) / 86400000);
}

// ─── Core Conversions ───────────────────────────────────────────────────────

/**
 * Convert a Gregorian (AD) date to Bikram Sambat (BS).
 *
 * Algorithm:
 * 1. Calculate total days from the reference AD date (14 Apr 1943) to the input.
 * 2. Starting at BS 2000/1/1, iterate through the lookup table year-by-year
 *    and month-by-month, subtracting month lengths until the remaining days
 *    fall within the current month.
 * 3. The remaining count + 1 gives the BS day.
 */
export function adToBs(adYear: number, adMonth: number, adDay: number): BsDate {
  const inputDate = new Date(adYear, adMonth - 1, adDay);

  // The Date constructor rolls impossible dates forward — 31 Feb becomes
  // 2 Mar — which would yield a plausible but wrong BS result. Reject any
  // input that did not survive the round trip unchanged.
  if (
    inputDate.getFullYear() !== adYear ||
    inputDate.getMonth() !== adMonth - 1 ||
    inputDate.getDate() !== adDay
  ) {
    throw new Error(
      `${adDay}/${adMonth}/${adYear} is not a real date in the Gregorian calendar`,
    );
  }

  let totalDays = daysSinceRefAd(inputDate);

  if (totalDays < 0) {
    throw new Error(
      "Date is before the supported range (before 14 April 1943 AD)",
    );
  }

  let bsYear = REF_BS.year;
  let bsMonth = REF_BS.month;

  // Subtract full years
  while (bsYear <= 2100) {
    const daysInYear = getTotalDaysInBsYear(bsYear);
    if (totalDays < daysInYear) break;
    totalDays -= daysInYear;
    bsYear++;
  }

  if (bsYear > 2100) {
    throw new Error("Date exceeds supported range (after BS 2100)");
  }

  // Subtract full months
  while (bsMonth <= 12) {
    const daysInMonth = getBsMonthDays(bsYear, bsMonth);
    if (totalDays < daysInMonth) break;
    totalDays -= daysInMonth;
    bsMonth++;
  }

  // If we've passed month 12, wrap to next year
  if (bsMonth > 12) {
    bsYear++;
    bsMonth = 1;
  }

  const bsDay = totalDays + 1;

  return { year: bsYear, month: bsMonth, day: bsDay };
}

/**
 * Convert a Bikram Sambat (BS) date to Gregorian (AD).
 *
 * Algorithm:
 * 1. Sum all days from BS 2000/1/1 up to (but not including) the input BS date
 *    by iterating through years and months in the lookup table.
 * 2. Add that total to the reference AD date (14 April 1943).
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  if (!isValidBsDate(bsYear, bsMonth, bsDay)) {
    throw new Error(`Invalid BS date: ${bsYear}/${bsMonth}/${bsDay}`);
  }

  let totalDays = 0;

  // Add full years from 2000 to bsYear-1
  for (let y = REF_BS.year; y < bsYear; y++) {
    totalDays += getTotalDaysInBsYear(y);
  }

  // Add full months in the target year
  for (let m = 1; m < bsMonth; m++) {
    totalDays += getBsMonthDays(bsYear, m);
  }

  // Add remaining days (subtract 1 because day 1 = 0 offset)
  totalDays += bsDay - 1;

  // Add to reference AD date
  const result = new Date(REF_AD);
  result.setDate(result.getDate() + totalDays);
  return result;
}

// ─── Convenience Functions ──────────────────────────────────────────────────

/** Get today's date in BS. */
export function getTodayBs(): BsDate {
  const now = new Date();
  return adToBs(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Get the day of week for a BS date (0=Sunday, 6=Saturday). */
export function getBsDayOfWeek(
  bsYear: number,
  bsMonth: number,
  bsDay: number,
): number {
  const adDate = bsToAd(bsYear, bsMonth, bsDay);
  return adDate.getDay();
}

/** Format a BS date as a human-readable string. */
export function formatBsDate(date: BsDate): string {
  return `${date.day} ${getBsMonthName(date.month)} ${date.year}`;
}

/** Format a BS date with Nepali month name. */
export function formatBsDateNp(date: BsDate): string {
  return `${date.day} ${getBsMonthNameNp(date.month)} ${date.year}`;
}

/** Format a JS Date as a readable AD string. */
export function formatAdDate(date: Date): string {
  return `${date.getDate()} ${AD_MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Calculate the total number of days between two BS dates.
 * Returns a positive number if 'to' is after 'from'.
 */
export function differenceInBsDays(from: BsDate, to: BsDate): number {
  const fromAd = bsToAd(from.year, from.month, from.day);
  const toAd = bsToAd(to.year, to.month, to.day);
  const utcFrom = Date.UTC(
    fromAd.getFullYear(),
    fromAd.getMonth(),
    fromAd.getDate(),
  );
  const utcTo = Date.UTC(toAd.getFullYear(), toAd.getMonth(), toAd.getDate());
  return Math.floor((utcTo - utcFrom) / 86400000);
}

/**
 * Calculate the difference between two BS dates in years, months, and days.
 * Uses actual variable month lengths — does NOT divide by 30 or 365.
 */
export function differenceInBsYMD(
  from: BsDate,
  to: BsDate,
): { years: number; months: number; days: number; totalDays: number } {
  const totalDays = differenceInBsDays(from, to);

  // Ensure 'from' is before 'to' for calculation
  let startY = from.year,
    startM = from.month,
    startD = from.day;
  const endY = to.year,
    endM = to.month,
    endD = to.day;
  const isNegative = totalDays < 0;

  if (isNegative) {
    // Swap
    startY = to.year;
    startM = to.month;
    startD = to.day;
  }

  let years = 0;
  let months = 0;
  let days = 0;

  let curY = startY;
  let curM = startM;
  let curD = startD;

  // Count full years (bounded by max supported range)
  for (let iter = 0; iter < 200; iter++) {
    const nextY = curY + 1;
    if (
      nextY > endY ||
      (nextY === endY && curM > endM) ||
      (nextY === endY && curM === endM && curD > endD)
    )
      break;
    if (nextY > 2100) break;
    years++;
    curY = nextY;
    // Clamp day if the same month in the new year has fewer days
    if (BS_CALENDAR_DATA[curY]) {
      const maxDay = getBsMonthDays(curY, curM);
      if (curD > maxDay) curD = maxDay;
    }
  }

  // Count full months (bounded by 12 months max per iteration)
  for (let iter = 0; iter < 2400; iter++) {
    let nextM = curM + 1;
    let nextY = curY;
    if (nextM > 12) {
      nextM = 1;
      nextY++;
    }
    if (nextY > 2100) break;
    if (
      nextY > endY ||
      (nextY === endY && nextM > endM) ||
      (nextY === endY && nextM === endM && curD > endD)
    )
      break;
    months++;
    curY = nextY;
    curM = nextM;
    if (BS_CALENDAR_DATA[curY]) {
      const maxDay = getBsMonthDays(curY, curM);
      if (curD > maxDay) curD = maxDay;
    }
  }

  // Remaining days
  const curBs: BsDate = { year: curY, month: curM, day: curD };
  const targetBs: BsDate = isNegative
    ? { year: startY, month: startM, day: startD }
    : { year: endY, month: endM, day: endD };
  days = Math.abs(differenceInBsDays(curBs, targetBs));

  return { years, months, days, totalDays: Math.abs(totalDays) };
}

/** Get the number of days remaining in the current BS month. */
export function daysRemainingInMonth(date: BsDate): number {
  return getBsMonthDays(date.year, date.month) - date.day;
}

/** Get the supported BS year range. */
export function getSupportedRange(): { minYear: number; maxYear: number } {
  return { minYear: 2000, maxYear: 2100 };
}
