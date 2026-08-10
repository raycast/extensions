import { Country, Format } from "./types";
import { formatDateTimeWithCountry } from "./utils/datetime";

/**
 * List of supported countries
 */
export const countries: Country[] = [
  { id: "japan", name: "Japan", timezoneOffset: 9, timezoneName: "JST", ianaTimeZone: "Asia/Tokyo" },
  { id: "new_york", name: "USA (New York)", timezoneOffset: -5, timezoneName: "EST", ianaTimeZone: "America/New_York" },
  {
    id: "los_angeles",
    name: "USA (Los Angeles)",
    timezoneOffset: -8,
    timezoneName: "PST",
    ianaTimeZone: "America/Los_Angeles",
  },
  { id: "korea", name: "Korea", timezoneOffset: 9, timezoneName: "KST", ianaTimeZone: "Asia/Seoul" },
  { id: "thailand", name: "Thailand", timezoneOffset: 7, timezoneName: "ICT", ianaTimeZone: "Asia/Bangkok" },
];

/**
 * List of supported formats
 */
export const formats: Format[] = [
  {
    id: "japanese_format",
    name: "Japanese Format",
    /**
     * Formats the date in Japanese locale and Japan time.
     * @param date Date object
     * @param country Country information
     * @returns Formatted string
     */
    format: (date, country) =>
      formatDateTimeWithCountry(date, country, "ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "short",
        hour12: false,
      }),
  },
  {
    id: "korean_format",
    name: "Korean Format",
    /**
     * Formats the date in Korean locale and Korea time.
     * @param date Date object
     * @param country Country information
     * @returns Formatted string
     */
    format: (date, country) =>
      formatDateTimeWithCountry(date, country, "ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "short",
        hour12: false,
      }),
  },
  {
    id: "thai_format",
    name: "Thai Format",
    /**
     * Formats the date in Thai locale and Thailand time.
     * @param date Date object
     * @param country Country information
     * @returns Formatted string
     */
    format: (date, country) =>
      formatDateTimeWithCountry(date, country, "th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "short",
        hour12: false,
      }),
  },
  {
    id: "iso_format",
    name: "ISO Format",
    /**
     * Formats the date in ISO 8601 format (UTC).
     * @param date Date object
     * @param country Country information
     * @returns Formatted string
     */
    format: (date, country) => {
      return { name: `${country.name} Time (${country.timezoneName})`, value: date.toISOString() };
    },
  },
  {
    id: "us_format",
    name: "US Format",
    /**
     * Formats the date in English locale and US time.
     * @param date Date object
     * @param country Country information
     * @returns Formatted string
     */
    format: (date, country) =>
      formatDateTimeWithCountry(date, country, "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        weekday: "short",
        hour12: true,
      }),
  },
];
