import { LocalStorage } from "@raycast/api";
import { AutoRefreshInterval } from "../types";

const STORAGE_KEY = "last-refresh-at";

const INTERVAL_DURATIONS_MS: Record<"hourly" | "daily", number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

async function getLastRefreshAt(): Promise<number | null> {
  const value = await LocalStorage.getItem<number>(STORAGE_KEY);
  return typeof value === "number" ? value : null;
}

export async function markRefreshedNow(): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, Date.now());
}

// A manual refresh also calls markRefreshedNow, so it resets this same timer.
export async function isAutoRefreshDue(interval: AutoRefreshInterval): Promise<boolean> {
  if (interval === "every-launch") return true;
  if (interval === "never") return false;

  const lastRefreshAt = await getLastRefreshAt();
  if (lastRefreshAt === null) return true;

  return Date.now() - lastRefreshAt >= INTERVAL_DURATIONS_MS[interval];
}
