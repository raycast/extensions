import { LocalStorage } from "@raycast/api";
import { ProviderUsage, ProviderType, DailyCost } from "../types";

const CACHE_KEY_PREFIX = "usage_cache_";
const COST_HISTORY_KEY = "cost_history";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedUsage {
  data: ProviderUsage;
  timestamp: number;
}

export async function getCachedUsage(
  provider: ProviderType,
): Promise<ProviderUsage | null> {
  const key = `${CACHE_KEY_PREFIX}${provider}`;
  const cached = await LocalStorage.getItem<string>(key);

  if (!cached) return null;

  try {
    const parsed: CachedUsage = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    if (age > CACHE_TTL_MS) return null;

    return {
      ...parsed.data,
      lastUpdated: parsed.data.lastUpdated
        ? new Date(parsed.data.lastUpdated)
        : null,
      windows: parsed.data.windows.map((w) => ({
        ...w,
        resetsAt: w.resetsAt ? new Date(w.resetsAt) : null,
      })),
    };
  } catch {
    return null;
  }
}

export async function setCachedUsage(
  provider: ProviderType,
  data: ProviderUsage,
): Promise<void> {
  const key = `${CACHE_KEY_PREFIX}${provider}`;
  const cached: CachedUsage = {
    data,
    timestamp: Date.now(),
  };
  await LocalStorage.setItem(key, JSON.stringify(cached));
}

export async function getCostHistory(): Promise<DailyCost[]> {
  const stored = await LocalStorage.getItem<string>(COST_HISTORY_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return parsed.map(
      (item: { date: string; cost: number; tokens: number }) => ({
        ...item,
        date: new Date(item.date),
      }),
    );
  } catch {
    return [];
  }
}

export async function addCostEntry(entry: DailyCost): Promise<void> {
  const history = await getCostHistory();
  const today = entry.date.toISOString().split("T")[0];

  const existingIndex = history.findIndex(
    (h) => h.date.toISOString().split("T")[0] === today,
  );

  if (existingIndex >= 0) {
    history[existingIndex] = entry;
  } else {
    history.push(entry);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filtered = history.filter((h) => h.date >= thirtyDaysAgo);

  await LocalStorage.setItem(COST_HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearCache(): Promise<void> {
  const allItems = await LocalStorage.allItems();
  for (const key of Object.keys(allItems)) {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      await LocalStorage.removeItem(key);
    }
  }
}
