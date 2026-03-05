import { LocalStorage } from "@raycast/api";

export const DISABLED_SHOW_NOTIFICATIONS_KEY = "new-episodes-disabled-show-ids";
export const PENDING_EPISODE_IDS_KEY = "new-episodes-pending-episode-ids";
export const DISCARDED_EPISODE_IDS_KEY = "new-episodes-discarded-episode-ids";

export function normalizeNumberIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();

  for (const item of value) {
    const parsed =
      typeof item === "number" ? item : Number.parseInt(String(item), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      seen.add(parsed);
    }
  }

  return Array.from(seen).sort((a, b) => a - b);
}

export async function getStoredNumberIds(key: string): Promise<number[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];

  try {
    return normalizeNumberIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function setStoredNumberIds(
  key: string,
  ids: number[],
): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(normalizeNumberIds(ids)));
}
