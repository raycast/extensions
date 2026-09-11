import type { ForecastResponse } from "../api/forecast-schema";
import { latestReset } from "./reset-history";

export type MenuBarDisplay = "likelihood-24h" | "likelihood-48h" | "last-reset";

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

export function formatPercentage(score: number | null | undefined): string {
  return score == null ? "—" : `${Math.round(clampScore(score))}%`;
}

export function formatCompactDurationSince(timestamp: string, now = new Date()): string {
  const elapsedMinutes = Math.floor(Math.max(0, now.getTime() - Date.parse(timestamp)) / 60_000);
  if (elapsedMinutes < 1) return "now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  const hours = Math.floor(elapsedMinutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

export function formatRelativeTime(timestamp: string, now = new Date()): string {
  const minutes = Math.trunc((Date.parse(timestamp) - now.getTime()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  if (Math.abs(minutes) < 1) return "now";
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.trunc(minutes / 60);
  return Math.abs(hours) < 24 ? formatter.format(hours, "hour") : formatter.format(Math.trunc(hours / 24), "day");
}

export function formatDateTime(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

export function formatRecordDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(timestamp));
}

export function menuBarTitle(response: ForecastResponse, display: MenuBarDisplay, now = new Date()): string {
  if (display === "last-reset") {
    const reset = latestReset(response, now);
    return reset ? formatCompactDurationSince(reset.dateTime, now) : "—";
  }
  const horizon = display === "likelihood-48h" ? "48h" : "24h";
  const score = horizon === "48h" ? response.forecast?.score48h : response.forecast?.score24h;
  return score == null ? "—" : `${formatPercentage(score)} · ${horizon}`;
}

export function forecastTooltip(response: ForecastResponse, now = new Date()): string {
  const reset = latestReset(response, now);
  return `Codex reset likelihood: ${formatPercentage(response.forecast?.score24h)} within 24h, ${formatPercentage(response.forecast?.score48h)} within 48h. Last reset: ${reset ? `${formatRelativeTime(reset.dateTime, now)} (${formatDateTime(reset.dateTime)})` : "unknown"}.`;
}

export function sourceWarning(response: ForecastResponse, now = new Date()): string | undefined {
  if (response.status !== "live" || response.forecastStatus !== "current")
    return "The source has not published a current forecast.";
  // A current forecast can remain unchanged until the source's next scheduled reassessment.
  if (response.forecast?.nextReassessmentAt && now.getTime() > Date.parse(response.forecast.nextReassessmentAt))
    return "The forecast is awaiting its scheduled reassessment.";
  if (
    response.ingestion &&
    (response.ingestion.status !== "succeeded" ||
      response.ingestion.accountsSucceeded < response.ingestion.accountsRequested)
  ) {
    return "Some monitored sources did not respond to the latest check.";
  }
  return undefined;
}
