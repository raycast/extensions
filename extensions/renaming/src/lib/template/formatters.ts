/**
 * Formatters for template variables
 *
 * Handles date/time formatting, number padding, and size formatting.
 */

import { FORMAT_CONSTANTS } from "../constants";

/**
 * Format a date according to a format string
 *
 * Supported tokens:
 * - YYYY: 4-digit year
 * - YY: 2-digit year
 * - MM: 2-digit month (01-12)
 * - M: 1 or 2-digit month (1-12)
 * - DD: 2-digit day (01-31)
 * - D: 1 or 2-digit day (1-31)
 *
 * @param date - Date to format
 * @param format - Format string (e.g., "YYYY-MM-DD")
 * @returns Formatted date string
 */
export function formatDate(date: Date, format: string = "YYYY-MM-DD"): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return format
    .replace(/YYYY/g, String(year))
    .replace(/YY/g, String(year).slice(-2))
    .replace(/MM/g, String(month).padStart(2, "0"))
    .replace(/M(?!M)/g, String(month))
    .replace(/DD/g, String(day).padStart(2, "0"))
    .replace(/D(?!D)/g, String(day));
}

/**
 * Format a time according to a format string
 *
 * Supported tokens:
 * - HH: 2-digit hour (00-23)
 * - H: 1 or 2-digit hour (0-23)
 * - hh: 2-digit 12-hour (01-12)
 * - h: 1 or 2-digit 12-hour (1-12)
 * - mm: 2-digit minute (00-59)
 * - m: 1 or 2-digit minute (0-59)
 * - ss: 2-digit second (00-59)
 * - s: 1 or 2-digit second (0-59)
 * - A: AM/PM
 * - a: am/pm
 *
 * @param date - Date to format time from
 * @param format - Format string (e.g., "HH-mm-ss")
 * @returns Formatted time string
 */
export function formatTime(date: Date, format: string = "HH-mm-ss"): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours24 >= 12 ? "PM" : "AM";

  return format
    .replace(/HH/g, String(hours24).padStart(2, "0"))
    .replace(/H(?!H)/g, String(hours24))
    .replace(/hh/g, String(hours12).padStart(2, "0"))
    .replace(/h(?!h)/g, String(hours12))
    .replace(/mm/g, String(minutes).padStart(2, "0"))
    .replace(/m(?!m)/g, String(minutes))
    .replace(/ss/g, String(seconds).padStart(2, "0"))
    .replace(/s(?!s)/g, String(seconds))
    .replace(/A/g, ampm)
    .replace(/a/g, ampm.toLowerCase());
}

/**
 * Format a number with zero-padding
 *
 * @param num - Number to format
 * @param format - Format string that defines padding (e.g., "001" for 3 digits)
 * @returns Padded number string
 *
 * @example
 * formatNumber(5, "001") // "005"
 * formatNumber(42, "0001") // "0042"
 * formatNumber(123, "00") // "123" (no truncation)
 */
export function formatNumber(num: number, format?: string): string {
  if (!format) {
    return String(num);
  }

  // Determine padding from format string
  // "001" = 3 digits, "0001" = 4 digits, etc.
  const padding = format.length;
  const sign = num < 0 ? "-" : "";
  const digits = String(Math.abs(num)).padStart(padding, "0");
  return `${sign}${digits}`;
}

/**
 * Parse a counter format string to extract padding width
 *
 * @param format - Format string like "001" or "0001"
 * @returns Padding width (the total length of the format string, or 1 if not provided)
 */
export function parseCounterFormat(format?: string): number {
  if (!format) {
    return 1;
  }
  // Count leading zeros plus one (e.g., "001" = 3)
  return format.length;
}

/**
 * Format file size to human-readable string
 *
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatSize(bytes: number, decimals: number = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), FORMAT_CONSTANTS.SIZE_UNITS.length - 1);
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(decimals)} ${FORMAT_CONSTANTS.SIZE_UNITS[i]}`;
}

/**
 * Format duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @returns Formatted duration (e.g., "1h 30m 45s" or "5m 30s")
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0s";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * Generate a random alphanumeric string
 *
 * @param length - Length of the string (default: 6)
 * @returns Random string
 */
export function generateRandom(length: number = FORMAT_CONSTANTS.DEFAULT_RANDOM_LENGTH): string {
  const chars = FORMAT_CONSTANTS.RANDOM_CHARS;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a UUID v4
 *
 * @returns UUID string
 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parse a format string to determine what type it is
 *
 * @param format - Format string to analyze
 * @returns Type of format
 */
export function detectFormatType(format: string): "date" | "time" | "number" | "unknown" {
  // Time patterns (check before date since 'mm' is ambiguous)
  if (/^[Hhms\-_.:AaPp]+$/.test(format)) {
    return "time";
  }

  // Date patterns (case-sensitive: only uppercase Y, M, D)
  if (/^[YMD\-_./]+$/.test(format)) {
    return "date";
  }

  // Number patterns (all zeros)
  if (/^0+$/.test(format)) {
    return "number";
  }

  return "unknown";
}
