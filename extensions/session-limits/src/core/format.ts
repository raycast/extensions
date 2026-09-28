import type { ProviderSnapshot, UsageWindow } from "./types";

export function remainingPercent(window: UsageWindow): number {
  return Math.round(Math.max(0, Math.min(100, 100 - window.usedPercent)) * 10) / 10;
}

export function formatReset(resetAt?: string, now = Date.now()): string {
  if (!resetAt || !Number.isFinite(Date.parse(resetAt))) return "Reset not reported";
  const minutes = Math.ceil((Date.parse(resetAt) - now) / 60_000);
  if (minutes <= 0) return "Reset passed · refresh needed";
  if (minutes < 60) return `Resets in ${minutes}m`;
  if (minutes < 1_440) return `Resets in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `Resets in ${Math.floor(minutes / 1_440)}d ${Math.floor((minutes % 1_440) / 60)}h`;
}

export function formatObserved(updatedAt: string, now = Date.now()): string {
  const age = Math.max(0, Math.floor((now - Date.parse(updatedAt)) / 60_000));
  if (!Number.isFinite(age)) return "Update time unknown";
  if (age < 1) return "Updated just now";
  if (age < 60) return `Updated ${age}m ago`;
  if (age < 1_440) return `Updated ${Math.floor(age / 60)}h ago`;
  return `Updated ${Math.floor(age / 1_440)}d ago`;
}

export function isStale(snapshot: ProviderSnapshot, now = Date.now()): boolean {
  const observed = Date.parse(snapshot.updatedAt);
  return (
    !Number.isFinite(observed) ||
    observed > now + 60_000 ||
    now - observed >= 15 * 60_000 ||
    snapshot.windows.some((window) => window.resetAt && Date.parse(window.resetAt) <= now)
  );
}
