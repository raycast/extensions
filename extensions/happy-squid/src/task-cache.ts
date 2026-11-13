import { LocalStorage } from "@raycast/api";
import type { TaskSnapshot } from "./vendor/task-control";
import { RAYCAST_SUPABASE_URL } from "./client";

export interface CachedTaskSnapshot {
  snapshot: TaskSnapshot;
  receivedAt: number;
}

const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1_000;

export function taskSnapshotCacheKey(userId: string | undefined): string {
  return `task-snapshot-v2:${RAYCAST_SUPABASE_URL}:${userId}`;
}

export async function writeCachedTaskSnapshot(
  key: string,
  snapshot: TaskSnapshot,
  receivedAt = Date.now(),
): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify({ snapshot, receivedAt }));
}

export async function readCachedTaskSnapshot(key: string): Promise<CachedTaskSnapshot | null> {
  try {
    const value = await LocalStorage.getItem<string>(key);
    if (!value) return null;
    const cached: CachedTaskSnapshot = JSON.parse(value);
    const age = Date.now() - cached.receivedAt;
    if (
      !Number.isFinite(age) ||
      age < 0 ||
      age > MAX_CACHE_AGE_MS ||
      !cached.snapshot?.deviceId ||
      !Number.isFinite(cached.snapshot.capturedAt) ||
      !Array.isArray(cached.snapshot.recentTasks) ||
      !Array.isArray(cached.snapshot.durationChoices)
    )
      return null;
    return cached;
  } catch {
    return null;
  }
}
