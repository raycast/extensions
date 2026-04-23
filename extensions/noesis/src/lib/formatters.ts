import { Color } from "@raycast/api";
import { DashboardSnapshot, RateLimitInfo, UsageWindowSummary } from "./types";

export function getHealthColor(status: string): Color {
  const normalized = status.toLowerCase();

  if (
    normalized === "ok" ||
    normalized === "healthy" ||
    normalized === "ready"
  ) {
    return Color.Green;
  }

  if (normalized === "degraded" || normalized === "warning") {
    return Color.Yellow;
  }

  return Color.Red;
}

export function getCacheColor(
  cacheState: DashboardSnapshot["cacheState"],
): Color {
  switch (cacheState) {
    case "fresh":
      return Color.Green;
    case "stale":
      return Color.Yellow;
    case "cached":
      return Color.SecondaryText;
    default:
      return Color.Red;
  }
}

export function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatAbsoluteTime(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function formatRateLimit(rateLimit: RateLimitInfo): string {
  if (
    typeof rateLimit.remaining === "number" &&
    typeof rateLimit.limit === "number"
  ) {
    return `${rateLimit.remaining}/${rateLimit.limit} left`;
  }

  if (typeof rateLimit.dailyRemaining === "number") {
    return `${rateLimit.dailyRemaining} daily left`;
  }

  return "Unavailable";
}

export function formatRateLimitReset(resetEpoch?: number): string {
  if (!resetEpoch) {
    return "Unknown";
  }

  return new Date(resetEpoch * 1000).toLocaleString();
}

export function formatRelativeTime(value?: string): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return value;
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  return date.toLocaleString();
}

export function formatTimeUntil(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();

  if (!Number.isFinite(diffMs)) {
    return value;
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatUsageWindow(summary: UsageWindowSummary): string {
  return `${summary.total} total · ${summary.success} ok · ${summary.failure} fail`;
}

export function formatReadingSubtitle(
  engineId: string,
  workflowId?: string,
): string {
  return workflowId ? `${engineId} · ${workflowId}` : engineId;
}

export function formatCalculationTime(milliseconds?: number): string {
  if (
    typeof milliseconds !== "number" ||
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return "Unavailable";
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

export function formatPhaseLabel(phase: number): string {
  return `Phase ${phase}`;
}

export function formatPhaseBadge(phase: number): string {
  return `P${phase}`;
}

export function getPhaseColor(phase: number): Color {
  if (phase <= 0) {
    return Color.SecondaryText;
  }

  if (phase === 1) {
    return Color.Blue;
  }

  if (phase === 2) {
    return Color.Orange;
  }

  return Color.Magenta;
}

export function formatCount(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatCompactCount(count: number, suffix: string): string {
  return `${count}${suffix}`;
}

export function formatHostLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.host;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
}

export function truncate(value: string | undefined, maxLength = 80): string {
  if (!value) {
    return "";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
