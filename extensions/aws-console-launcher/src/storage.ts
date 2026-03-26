import { LocalStorage } from "@raycast/api";
import { UsageMap } from "./types";

const STORAGE_KEY = "awsc-usage";

export async function getUsageMap(): Promise<UsageMap> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UsageMap;
  } catch {
    return {};
  }
}

export async function recordUsage(serviceId: string): Promise<void> {
  const map = await getUsageMap();
  const existing = map[serviceId];
  map[serviceId] = {
    serviceId,
    lastOpenedAt: Date.now(),
    openCount: (existing?.openCount ?? 0) + 1,
  };
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}
