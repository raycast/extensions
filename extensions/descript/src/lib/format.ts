/**
 * Tiny date / duration helpers tailored for compact Raycast accessories.
 * Kept dependency-free so they work in any runtime context.
 */

const RELATIVE_TIME = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
  { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", ms: 24 * 60 * 60 * 1000 },
  { unit: "hour", ms: 60 * 60 * 1000 },
  { unit: "minute", ms: 60 * 1000 },
];

export function relativeTime(input: string | Date | undefined | null): string | undefined {
  if (!input) return undefined;
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return undefined;
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  if (absMs < 30_000) return "just now";
  for (const { unit, ms } of UNITS) {
    if (absMs >= ms) {
      const value = Math.round(diffMs / ms);
      return RELATIVE_TIME.format(value, unit);
    }
  }
  return RELATIVE_TIME.format(Math.round(diffMs / 1000), "second");
}

export function formatDateTime(input: string | Date | undefined | null): string | undefined {
  if (!input) return undefined;
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number | undefined): string | undefined {
  if (!seconds || !Number.isFinite(seconds)) return undefined;
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}
