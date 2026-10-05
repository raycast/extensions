import { LocalStorage } from "@raycast/api";
import { displayRemotePath, normalizeRemotePath } from "../lib/paths";

interface RecentDestination {
  path: string;
  lastUsedAt: number;
}

function storageKey(deviceId: string): string {
  return `boox.recent-destinations.${deviceId}`;
}

export async function getRecentDestinations(deviceId: string): Promise<RecentDestination[]> {
  const value = await LocalStorage.getItem<string>(storageKey(deviceId));
  if (!value) return [];
  try {
    return (JSON.parse(value) as RecentDestination[]).slice(0, 5);
  } catch {
    await LocalStorage.removeItem(storageKey(deviceId));
    return [];
  }
}

export async function rememberDestination(deviceId: string, destination: string): Promise<void> {
  const normalized = displayRemotePath(normalizeRemotePath(destination));
  const existing = await getRecentDestinations(deviceId);
  const next = [
    { path: normalized, lastUsedAt: Date.now() },
    ...existing.filter((item) => item.path !== normalized),
  ].slice(0, 5);
  await LocalStorage.setItem(storageKey(deviceId), JSON.stringify(next));
}
