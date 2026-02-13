import { MetricLine } from "./types";

const formatResetTime = (date: Date): string => {
  const secondsRemaining = (date.getTime() - Date.now()) / 1000;
  if (secondsRemaining <= 0) return "Resets soon";

  const totalSeconds = Math.floor(secondsRemaining);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `Resets in ${days}d ${hours}h`;
  if (hours > 0) return `Resets in ${hours}h ${minutes}m`;
  if (minutes > 0) return `Resets in ${minutes}m`;
  return "Resets in <1m";
};

export const formatResetTimeFromISO = (isoString: string): string | undefined => {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return undefined;
  return formatResetTime(date);
};

export const formatResetTimeFromUnixSeconds = (seconds: number): string | undefined => {
  return formatResetTime(new Date(seconds * 1000));
};

export const formatResetTimeFromUnixMillisecondsString = (msString: string): string | undefined => {
  const ms = parseInt(msString, 10);
  if (isNaN(ms)) return undefined;
  return formatResetTime(new Date(ms));
};

export const formatProgressBar = (percentage: number, length = 10): string => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return "■".repeat(filled) + "□".repeat(empty);
};

export const formatProgressValue = (value: number, max: number, unit?: "percent" | "dollars"): string => {
  switch (unit) {
    case "percent":
      return `${Math.round(value)}%`;
    case "dollars":
      return `$${value.toFixed(2)}`;
    default:
      return value.toFixed(1);
  }
};

export const formatLastUpdatedAt = (ms: number): string => {
  const elapsed = Date.now() - ms;
  if (elapsed < 60 * 1000) return "just now";
  if (elapsed < 60 * 60 * 1000) return `${Math.floor(elapsed / 60000)}m ago`;
  if (elapsed < 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / 3600000)}h ago`;
  if (elapsed < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / 86400000)}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const getPrimaryPercentage = (lines: MetricLine[]): number | undefined => {
  let fallback: number | undefined;
  for (const line of lines) {
    if (line.type !== "progress" || line.max <= 0) continue;
    const pct = Math.min(100, Math.max(0, (line.value / line.max) * 100));
    if (line.unit === "percent") return pct;
    fallback ??= pct;
  }
  return fallback;
};
