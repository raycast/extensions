export function formatDuration(durationMs: number | null | undefined): string {
  if (durationMs === null || durationMs === undefined || durationMs <= 0) return "—";
  const totalSeconds = Math.round(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

const RELATIVE_FORMATTER = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const RELATIVE_UNITS: Array<{ limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "hour" },
  { limit: 604800, divisor: 86400, unit: "day" },
  { limit: 2629800, divisor: 604800, unit: "week" },
  { limit: 31557600, divisor: 2629800, unit: "month" },
  { limit: Number.POSITIVE_INFINITY, divisor: 31557600, unit: "year" },
];

export function formatRelativeTime(value: Date | string | null | undefined): string {
  if (!value) return "";
  const then = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const diffSeconds = (then - Date.now()) / 1000;
  const absSeconds = Math.abs(diffSeconds);
  for (const { limit, divisor, unit } of RELATIVE_UNITS) {
    if (absSeconds < limit) {
      return RELATIVE_FORMATTER.format(Math.round(diffSeconds / divisor), unit);
    }
  }
  return RELATIVE_FORMATTER.format(Math.round(diffSeconds / 31557600), "year");
}

export function isExpiringSoon(expiresAt: Date | string | null | undefined, thresholdDays = 7): boolean {
  if (!expiresAt) return false;
  const expires = expiresAt instanceof Date ? expiresAt.getTime() : new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) return false;
  const diffMs = expires - Date.now();
  if (diffMs <= 0) return true;
  return diffMs <= thresholdDays * 86400 * 1000;
}
