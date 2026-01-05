import { TimeRange } from "./types";

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export function getDateRange(range: TimeRange): { start: string; end: string } {
  switch (range) {
    case "today":
      return { start: "today", end: "today" };
    case "7d":
      return { start: "today-6d", end: "today" };
    case "30d":
      return { start: "today-29d", end: "today" };
    default:
      return { start: "today", end: "today" };
  }
}

export function getTimeRangeLabel(range: TimeRange): string {
  switch (range) {
    case "today":
      return "Last 24 hours";
    case "7d":
      return "Last 7 days";
    case "30d":
      return "Last 30 days";
    default:
      return "Last 24 hours";
  }
}

export function truncatePath(path: string, maxLength: number = 30): string {
  if (path.length <= maxLength) {
    return path;
  }
  return path.substring(0, maxLength - 3) + "...";
}
