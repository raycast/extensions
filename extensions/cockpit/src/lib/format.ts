import type { RateLimitWindow } from "./types";

const byteUnits = ["B", "KB", "MB", "GB", "TB"];
const bitUnits = ["b", "Kb", "Mb", "Gb", "Tb"];

export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function formatBytes(value: number, decimals = 1): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), byteUnits.length - 1);
  const scaled = value / 1024 ** index;
  return `${scaled.toFixed(index === 0 ? 0 : decimals)} ${byteUnits[index]}`;
}

export function formatRate(bytesPerSecond: number, units: "bytes" | "bits"): string {
  const multiplier = units === "bits" ? 8 : 1;
  const suffixUnits = units === "bits" ? bitUnits : byteUnits;
  const value = Math.max(0, bytesPerSecond * multiplier);
  if (!Number.isFinite(value) || value === 0) return `0 ${suffixUnits[0]}/s`;
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1000)), suffixUnits.length - 1);
  const scaled = value / 1000 ** index;
  return `${scaled.toFixed(index === 0 ? 0 : 1)} ${suffixUnits[index]}/s`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(seconds / 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function remainingPercent(window: RateLimitWindow): number {
  return clampPercent(100 - window.usedPercent);
}

export function formatWindowName(minutes: number | null): string {
  if (!minutes) return "Usage window";
  if (minutes <= 300) return `${Math.round(minutes / 60)}-hour window`;
  if (minutes <= 1440) return "Daily window";
  if (minutes <= 10080) return "Weekly window";
  if (minutes <= 44640) return "Monthly window";
  return `${Math.round(minutes / 1440)}-day window`;
}

export function formatResetTime(timestamp: number | null): string {
  if (!timestamp) return "Reset time unavailable";
  const date = new Date(timestamp * 1000);
  const now = Date.now();
  const remainingMs = date.getTime() - now;

  if (remainingMs <= 0) return "Resetting soon";

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const relative = days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const absolute = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${relative} · ${absolute}`;
}

export function formatAge(timestamp: number): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "Updated just now";
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

export function progressGlyph(percent: number): string {
  const filled = Math.round(clampPercent(percent) / 10);
  return `${"●".repeat(filled)}${"○".repeat(10 - filled)}`;
}
