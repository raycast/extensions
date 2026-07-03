import { LocalStorage } from "@raycast/api";

export type CacheRecord<T> = {
  savedAt: string;
  data: T;
};

export const habitifyCacheKeys = {
  activeHabits: "habitify:habits:active",
  areas: "habitify:areas",
  habit(habitId: string) {
    return `habitify:habit:${habitId}`;
  },
  habitsByArea(areaId: string) {
    return `habitify:habits:area:${areaId}`;
  },
  stats(habitId: string) {
    return `habitify:stats:${habitId}`;
  },
  todayJournal(date: string) {
    return `habitify:journal:${date}`;
  },
} as const;

export async function readCache<T>(key: string): Promise<CacheRecord<T> | null> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CacheRecord<T>>;
    if (typeof parsed.savedAt !== "string" || !("data" in parsed)) {
      return null;
    }

    return parsed as CacheRecord<T>;
  } catch {
    return null;
  }
}

export async function deleteCache(key: string) {
  await LocalStorage.removeItem(key);
}

export async function writeCache<T>(key: string, data: T) {
  const record: CacheRecord<T> = {
    savedAt: new Date().toISOString(),
    data,
  };

  await LocalStorage.setItem(key, JSON.stringify(record));
}

export function formatCacheTimestamp(savedAt: string) {
  return new Date(savedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function latestCacheTimestamp(...timestamps: Array<string | null | undefined>) {
  const parsed = timestamps
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (parsed.length === 0) {
    return null;
  }

  return new Date(Math.max(...parsed)).toISOString();
}
