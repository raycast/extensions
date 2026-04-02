import { LocalStorage } from "@raycast/api";

const USAGE_KEY = "usage-counts";

/**
 * Usage data: maps a composite key (accountId:roleName:region) to an open count.
 */
export interface UsageData {
  [key: string]: number;
}

/**
 * Build a composite key for tracking usage of a specific role in a specific region.
 */
export function usageKey(
  accountId: string,
  roleName: string,
  region: string,
): string {
  return `${accountId}:${roleName}:${region}`;
}

/**
 * Load all usage counts from LocalStorage.
 */
export async function loadUsageCounts(): Promise<UsageData> {
  const raw = await LocalStorage.getItem<string>(USAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UsageData;
  } catch {
    return {};
  }
}

/**
 * Increment the usage count for a specific role+region combination.
 */
export async function trackUsage(
  accountId: string,
  roleName: string,
  region: string,
): Promise<void> {
  const counts = await loadUsageCounts();
  const key = usageKey(accountId, roleName, region);
  counts[key] = (counts[key] || 0) + 1;
  await LocalStorage.setItem(USAGE_KEY, JSON.stringify(counts));
}

/**
 * Get the usage count for a specific role+region combination.
 */
export function getUsageCount(
  data: UsageData,
  accountId: string,
  roleName: string,
  region: string,
): number {
  return data[usageKey(accountId, roleName, region)] || 0;
}

/**
 * Get the total usage count for an entire account (sum of all role+region combos for that account).
 */
export function getAccountUsageCount(
  data: UsageData,
  accountId: string,
): number {
  const prefix = `${accountId}:`;
  let total = 0;
  for (const [key, count] of Object.entries(data)) {
    if (key.startsWith(prefix)) {
      total += count;
    }
  }
  return total;
}
