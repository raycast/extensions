import { Country, Format } from "./types";
import { formatDateTimeWithCountry } from "./utils/datetime";

/**
 * サポートする国一覧
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
 * サポートするフォーマット一覧
 */
export const formats: Format[] = [
  {
    id: "japanese_format",
    name: "Japanese Format",
    /**
     * 日本語ロケール・日本時間で日付をフォーマットします。
     * @param date 日付オブジェクト
     * @param country 国情報
     * @returns フォーマット済み文字列
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
     * 韓国語ロケール・韓国時間で日付をフォーマットします。
     * @param date 日付オブジェクト
     * @param country 国情報
     * @returns フォーマット済み文字列
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
     * タイ語ロケール・タイ時間で日付をフォーマットします。
     * @param date 日付オブジェクト
     * @param country 国情報
     * @returns フォーマット済み文字列
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
     * ISO 8601形式（UTC）で日付をフォーマットします。
     * @param date 日付オブジェクト
     * @param country 国情報
     * @returns フォーマット済み文字列
     */
    format: (date, country) => {
      return `${country.name} Time (${country.timezoneName}): ${date.toISOString()}`;
    },
  },
  {
    id: "us_format",
    name: "US Format",
    /**
     * 英語ロケール・アメリカ時間で日付をフォーマットします。
     * @param date 日付オブジェクト
     * @param country 国情報
     * @returns フォーマット済み文字列
     */
    format: (date, country) => {
      const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
        hour12: false,
        timeZone: country.ianaTimeZone,
      };
      return `${country.name} Time (${country.timezoneName}): ${date.toLocaleString("en-US", options)}`;
    },
  },
];
