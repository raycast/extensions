import { LocalStorage } from "@raycast/api";
import type { SeenMap, PRWithActivity, ActivityItem } from "./types";
import { prKey } from "./types";
import { getAllActivity } from "./utils";

const STORAGE_KEY = "gh_pr_seen";

export async function loadSeen(): Promise<SeenMap> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SeenMap;
  } catch {
    return {};
  }
}

export async function saveSeen(map: SeenMap, activePrKeys?: Set<string>): Promise<void> {
  if (activePrKeys) {
    for (const key of Object.keys(map)) {
      if (!activePrKeys.has(key)) {
        delete map[key];
      }
    }
  }
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Mark a single activity item as seen */
export async function markItemSeen(pr: PRWithActivity, item: ActivityItem): Promise<SeenMap> {
  const map = await loadSeen();
  const key = prKey(pr);
  if (!map[key]) {
    map[key] = { lastSeen: new Date().toISOString(), seenItemIds: [] };
  }
  if (!map[key].seenItemIds.includes(item.itemKey)) {
    map[key].seenItemIds.push(item.itemKey);
  }
  await saveSeen(map);
  return map;
}

/** Mark all current activity on a PR as seen */
export async function markPRSeen(pr: PRWithActivity): Promise<SeenMap> {
  const map = await loadSeen();
  const allItems = getAllActivity(pr);
  map[prKey(pr)] = {
    lastSeen: new Date().toISOString(),
    seenItemIds: allItems.map((i) => i.itemKey),
  };
  await saveSeen(map);
  return map;
}

/** Mark all PRs as seen */
export async function markAllSeen(prs: PRWithActivity[]): Promise<SeenMap> {
  const map = await loadSeen();
  for (const pr of prs) {
    const allItems = getAllActivity(pr);
    map[prKey(pr)] = {
      lastSeen: new Date().toISOString(),
      seenItemIds: allItems.map((i) => i.itemKey),
    };
  }
  // Do NOT prune here: `prs` is only the capped/displayed subset, so pruning by it would delete
  // seen state for already-read open PRs outside the subset (they'd resurface as unread). Closed-PR
  // pruning is handled by the fetch path, which knows the full set of open PR keys.
  await saveSeen(map);
  return map;
}
