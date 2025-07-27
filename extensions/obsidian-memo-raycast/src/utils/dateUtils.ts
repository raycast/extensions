/**
 * 日付フォーマットのユーティリティ関数
 */

/**
 * 曜日の日本語表記
 */
const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 曜日の英語表記（3文字）
 */
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * 数値を指定桁数の0埋め文字列に変換
 */
const pad = (num: number, length: number): string => {
  return num.toString().padStart(length, "0");
};

/**
 * 日付パターンを実際の日付文字列に変換
 * @param pattern - 日付パターン（例: "{{DATE:YYYY-MM-DD(ddd)}}"）
 * @param date - 対象の日付（デフォルトは現在日時）
 * @returns フォーマットされた日付文字列
 */
export const formatDatePattern = (
  pattern: string,
  date: Date = new Date(),
): string => {
  return pattern.replace(/\{\{DATE:([^}]+)\}\}/g, (match, format) => {
    return formatDate(format, date);
  });
};

/**
 * 日付を指定されたフォーマットで文字列に変換
 * @param format - フォーマット文字列
 * @param date - 対象の日付
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (format: string, date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = date.getDay();

  return format
    .replace(/YYYY/g, year.toString())
    .replace(/YY/g, year.toString().slice(-2))
    .replace(/MM/g, pad(month, 2))
    .replace(/M/g, month.toString())
    .replace(/DD/g, pad(day, 2))
    .replace(/D/g, day.toString())
    .replace(/ddd/g, WEEKDAYS_JA[weekday])
    .replace(/dd/g, WEEKDAYS_EN[weekday]);
};

/**
 * 現在時刻を HH:MM 形式で取得
 * @returns 現在時刻の文字列
 */
export const getCurrentTime = (): string => {
  const now = new Date();
  return `${pad(now.getHours(), 2)}:${pad(now.getMinutes(), 2)}`;
};
