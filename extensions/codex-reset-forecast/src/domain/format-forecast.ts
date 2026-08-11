import type { ForecastResponse } from "../api/forecast-schema";

type MenuBarDisplay = "likelihood" | "last-reset";

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

export function formatPercentage(score: number): string {
  return `${Math.round(clampScore(score))}%`;
}

export function formatCompactDurationSince(timestamp: string, now = new Date()): string {
  const elapsedMilliseconds = Math.max(0, now.getTime() - new Date(timestamp).getTime());
  const elapsedMinutes = Math.floor(elapsedMilliseconds / 60_000);

  if (elapsedMinutes < 1) return "now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h`;

  return `${Math.floor(elapsedHours / 24)}d`;
}

export function formatRelativeTime(timestamp: string, now = new Date()): string {
  const elapsedMilliseconds = Math.max(0, now.getTime() - new Date(timestamp).getTime());
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  const elapsedMinutes = Math.floor(elapsedMilliseconds / 60_000);

  if (elapsedMinutes < 1) return "now";
  if (elapsedMinutes < 60) return formatter.format(-elapsedMinutes, "minute");

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return formatter.format(-elapsedHours, "hour");

  return formatter.format(-Math.floor(elapsedHours / 24), "day");
}

export function formatDateTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function menuBarTitle(response: ForecastResponse, display: MenuBarDisplay, now = new Date()): string {
  if (display === "last-reset") {
    return formatCompactDurationSince(response.forecast.latestResetAt, now);
  }

  return formatPercentage(response.forecast.score);
}

export function forecastTooltip(response: ForecastResponse, now = new Date()): string {
  return `${formatPercentage(response.forecast.score)} forecast likelihood of a surprise Codex quota reset — last confirmed reset ${formatRelativeTime(
    response.forecast.latestResetAt,
    now,
  )}`;
}

export function scoreTransition(fromScore: number, toScore: number): string {
  return `${formatPercentage(fromScore)} → ${formatPercentage(toScore)}`;
}
