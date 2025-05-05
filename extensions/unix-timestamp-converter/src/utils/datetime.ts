import { Country } from "../types";

/**
 * 指定した国・ロケール・オプションで日付をフォーマットし、国名・タイムゾーン名付きで返す
 * @param date 日付オブジェクト
 * @param country 国情報
 * @param locale ロケール（例: "ja-JP"）
 * @param options Intl.DateTimeFormatOptions
 * @returns 例: "Japan Time (JST): 2025/05/03(土) 22:02:33"
 */
export const formatDateTimeWithCountry = (
  date: Date,
  country: Country,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string => {
  return `${country.name} Time (${country.timezoneName}): ${date.toLocaleString(locale, {
    ...options,
    timeZone: country.ianaTimeZone,
  })}`;
};

/**
 * 指定した国のローカルタイムとしてDateを生成し、UNIXタイムスタンプを返す
 * @param year 年
 * @param month 月
 * @param day 日
 * @param hour 時
 * @param minute 分
 * @param second 秒
 * @param country 国情報
 * @returns UNIXタイムスタンプ（秒）
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
 * UNIXタイムスタンプからDateを生成
 * @param unixTime UNIXタイムスタンプ（秒）
 * @returns Dateオブジェクト
 */
export const getDateFromUnixTime = (unixTime: number): Date => {
  return new Date(unixTime * 1000);
};

/**
 * 数値バリデーション
 * @param v 入力値
 * @returns エラーメッセージまたはundefined
 */
export const validateNumber = (v: string | undefined): string | undefined =>
  !v ? "Required" : isNaN(Number(v)) ? "Number only" : undefined;
