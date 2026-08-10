import { Country } from "../types";

/**
 * Formats the date with the specified country, locale, and options, and returns it with country name and timezone
 * @param date Date object
 * @param country Country information
 * @param locale Locale (e.g., "ja-JP")
 * @param options Intl.DateTimeFormatOptions
 * @returns Example: "Japan Time (JST): 2025/05/03(土) 22:02:33"
 */
export const formatDateTimeWithCountry = (
  date: Date,
  country: Country,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): { name: string; value: string } => {
  return {
    name: `${country.name} Time (${country.timezoneName})`,
    value: `${date.toLocaleString(locale, {
      ...options,
      timeZone: country.ianaTimeZone,
    })}`,
  };
};

/**
 * Generates a Date as the local time of the specified country and returns the UNIX timestamp
 * @param year Year
 * @param month Month
 * @param day Day
 * @param hour Hour
 * @param minute Minute
 * @param second Second
 * @param country Country information
 * @returns UNIX timestamp (seconds)
 */
export const getUnixTimeFromLocalDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  country: Country,
): number => {
  const utc = Date.UTC(year, month - 1, day, hour - country.timezoneOffset, minute, second);
  return Math.floor(utc / 1000);
};

/**
 * Generates a Date from a UNIX timestamp
 * @param unixTime UNIX timestamp (seconds)
 * @returns Date object
 */
export const getDateFromUnixTime = (unixTime: number): Date => {
  return new Date(unixTime * 1000);
};

/**
 * Number validation
 * @param v Input value
 * @returns Error message or undefined
 */
export const validateNumber = (v: string | undefined): string | undefined =>
  !v ? "Required" : isNaN(Number(v)) ? "Number only" : undefined;
