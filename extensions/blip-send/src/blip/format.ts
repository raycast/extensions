import type { Timestamp } from "./client";

export function formatBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value < 10 ? 2 : value < 100 ? 1 : 0;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** Blip reports throughput in kilobits per second. */
export function formatSpeed(kbps: number | undefined): string | undefined {
  if (!kbps || kbps <= 0) return undefined;
  const bytesPerSecond = (kbps * 1000) / 8;
  return `${formatBytes(bytesPerSecond)}/s`;
}

const EARLIEST_PLAUSIBLE_SECONDS = 946_684_800; // 2000-01-01, Blip uses Go's zero time for "never"

export function toDate(ts: Timestamp | undefined): Date | undefined {
  if (!ts || ts.seconds === undefined || ts.seconds < EARLIEST_PLAUSIBLE_SECONDS) return undefined;
  return new Date(ts.seconds * 1000 + Math.floor((ts.nanos ?? 0) / 1e6));
}

export function relativeTime(date: Date | undefined): string | undefined {
  if (!date) return undefined;
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.round(months / 12)} y ago`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Figure space: the width of one digit in most fonts. Used to line accessories up in columns. */
const FIGURE_SPACE = " ";

/** Right-aligns `value` inside a column of `width` characters. */
export function padColumn(value: string, width: number): string {
  const missing = Math.max(0, width - value.length);
  return FIGURE_SPACE.repeat(missing) + value;
}

/** Centres `value` inside a column of `width` characters, for tags. */
export function padCentred(value: string, width: number): string {
  const missing = Math.max(0, width - value.length);
  const left = Math.floor(missing / 2);
  return FIGURE_SPACE.repeat(left) + value + FIGURE_SPACE.repeat(missing - left);
}

/**
 * Compact time stamp that is always five characters wide: "22:59" today, "11/09" this year,
 * "2025" (padded) for older dates. Digits keep column alignment in proportional fonts.
 */
export function compactTime(date: Date | undefined): string {
  if (!date) return "";
  const now = new Date();
  const two = (n: number) => String(n).padStart(2, "0");
  if (date.toDateString() === now.toDateString()) return `${two(date.getHours())}:${two(date.getMinutes())}`;
  if (date.getFullYear() === now.getFullYear()) return `${two(date.getDate())}/${two(date.getMonth() + 1)}`;
  return String(date.getFullYear());
}

/**
 * Size text with a constant visual width for column use: always three digits' worth of width,
 * one period's worth, a space, and a two-letter unit. Missing glyphs are replaced by spaces of
 * the same width (figure space U+2007 for a digit, punctuation space U+2008 for a period).
 */
export function formatBytesColumn(bytes: number | undefined): string {
  if (!bytes || bytes < 1000) return "  <1 KB";
  const text = formatBytes(bytes); // "9.49 MB", "48.7 MB", "629 MB"
  const [number, unit] = text.split(" ");
  const digits = number.replace(".", "").length;
  const period = number.includes(".") ? "" : " ";
  return " ".repeat(Math.max(0, 3 - digits)) + period + number + " " + unit;
}

/** Shortens a label with an ellipsis so it fits a column. */
export function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max - 1).trimEnd() + "…";
}
