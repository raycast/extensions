const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
  ["second", 1],
];

const RTF = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export type TimestampInput = string | number | Date | null | undefined;

export function toDate(value: TimestampInput): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    // Unix seconds (spoo uses this for expire_after) vs. milliseconds.
    return new Date(value < 1e12 ? value * 1000 : value);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelative(value: TimestampInput): string {
  const date = toDate(value);
  if (!date) return "—";
  const diffSeconds = (date.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diffSeconds);
  for (const [unit, secs] of RELATIVE_UNITS) {
    if (abs >= secs || unit === "second") {
      return RTF.format(Math.round(diffSeconds / secs), unit);
    }
  }
  return "just now";
}

export function formatClicks(n: number | null | undefined): string {
  const value = n ?? 0;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export function progressBar(
  current: number,
  total: number,
  width = 10,
): string {
  if (!total || total <= 0) return "";
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
