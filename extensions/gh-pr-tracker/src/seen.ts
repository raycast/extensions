import { LocalStorage } from "@raycast/api";
import type { SeenMap, SeenState, PRWithActivity, ActivityItem } from "./types";
import { prKey } from "./types";
import { getAllActivity } from "./utils";
import { storeLog as log, getErrorMessage } from "./logger";

const STORAGE_KEY = "gh_pr_seen";

export async function loadSeen(): Promise<SeenMap> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    // `null` and arrays are valid JSON but not a SeenMap — without this, a corrupt payload passes
    // and throws later at the `seen[prKey(pr)]` lookup in api.ts instead of resetting here.
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      log.error("Seen state has an unexpected shape and was reset — all PRs will appear unread", {
        type: parsed === null ? "null" : Array.isArray(parsed) ? "array" : typeof parsed,
      });
      return {};
    }
    // Drop entries whose seenItemIds isn't an array — `new Set(nonIterable)` throws in
    // getUnseenActivity, which would surface as a crash rather than a reset.
    const map: SeenMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = value as Partial<SeenState> | null;
      if (entry != null && typeof entry === "object" && Array.isArray(entry.seenItemIds)) {
        map[key] = {
          lastSeen: typeof entry.lastSeen === "string" ? entry.lastSeen : new Date(0).toISOString(),
          seenItemIds: entry.seenItemIds.filter((id): id is string => typeof id === "string"),
          fullySeenAt: typeof entry.fullySeenAt === "string" ? entry.fullySeenAt : undefined,
          watermarkSource: entry.watermarkSource === "updated-at" ? "updated-at" : "wall-clock",
        };
      }
    }
    return map;
  } catch (error) {
    // Corrupt seen state presents to the user as "all my read history vanished" — every PR
    // resurfaces as unread. Loud, because the recovery (mark all as read) is destructive-ish.
    log.error("Seen state is corrupt and was reset — all PRs will appear unread", {
      error: getErrorMessage(error),
      rawLength: raw.length,
    });
    return {};
  }
}

export async function saveSeen(map: SeenMap, activePrKeys?: Set<string>): Promise<void> {
  if (activePrKeys) {
    // Prune only WITHIN repositories this scan actually covered. `activePrKeys` is the set of
    // open PRs across the *currently configured* repos, so a key from any other repo is simply
    // out of scope — not closed.
    //
    // Without this, temporarily removing a repo from preferences deleted its entire read history
    // on the next refresh, and re-adding it resurfaced every historical item as unread. Seen
    // state is the whole point of the extension; losing it because a preference changed is worse
    // than carrying a few stale entries for repos the user may return to.
    const scannedRepos = new Set<string>();
    for (const key of activePrKeys) {
      const repo = key.slice(0, key.lastIndexOf("#"));
      if (repo) scannedRepos.add(repo);
    }
    for (const key of Object.keys(map)) {
      const repo = key.slice(0, key.lastIndexOf("#"));
      if (scannedRepos.has(repo) && !activePrKeys.has(key)) {
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

/**
 * Backfill the `fullySeenAt` watermark for PRs whose entire fetched activity is already in
 * `seenItemIds`.
 *
 * Without this the watermark only ever appears on PRs the user marks read *after* upgrading, so
 * the metadata prefilter skips nothing and every scanned PR still costs a full activity fetch
 * (observed: `skippedByWatermark: 0`, 150/150 fetched, 152 rate-limit points).
 *
 * This is safe because it is derived from the same evidence the UI uses: if no item in the PR's
 * current activity is unseen, the PR *was* fully seen. It is deliberately NOT derived from
 * `lastSeen`, which a single-item mark advances while other activity remains unread.
 *
 * The recorded timestamp is the PR's own `updated_at`, not `now` — using `now` would claim we had
 * seen activity up to the present moment, which would skip genuinely new items that arrived
 * during the fetch.
 */
export async function applyFullySeenWatermarks(watermarks: { key: string; updatedAt: string }[]): Promise<SeenMap> {
  const map = await loadSeen();
  let applied = 0;
  for (const { key, updatedAt } of watermarks) {
    const entry = map[key];
    // Only fill a MISSING watermark. Never overwrite one: an existing value may be newer than
    // this PR's updated_at, and moving it backwards would re-fetch the PR every refresh.
    if (!entry || entry.fullySeenAt) continue;
    map[key] = { ...entry, fullySeenAt: updatedAt, watermarkSource: "updated-at" };
    applied++;
  }
  if (applied > 0) {
    log.info("Recorded full-PR watermarks for already-read PRs", { count: applied });
    await saveSeen(map);
  }
  return map;
}

/** Mark all current activity on a PR as seen */
export async function markPRSeen(pr: PRWithActivity): Promise<SeenMap> {
  const map = await loadSeen();
  const allItems = getAllActivity(pr);
  const now = new Date().toISOString();
  map[prKey(pr)] = {
    lastSeen: now,
    seenItemIds: allItems.map((i) => i.itemKey),
    fullySeenAt: now,
    watermarkSource: "wall-clock",
  };
  await saveSeen(map);
  return map;
}

/** Mark all PRs as seen */
export async function markAllSeen(prs: PRWithActivity[]): Promise<SeenMap> {
  const map = await loadSeen();
  const now = new Date().toISOString();
  for (const pr of prs) {
    const allItems = getAllActivity(pr);
    map[prKey(pr)] = {
      lastSeen: now,
      seenItemIds: allItems.map((i) => i.itemKey),
      fullySeenAt: now,
      watermarkSource: "wall-clock",
    };
  }
  // Do NOT prune here: `prs` is only the capped/displayed subset, so pruning by it would delete
  // seen state for already-read open PRs outside the subset (they'd resurface as unread). Closed-PR
  // pruning is handled by the fetch path, which knows the full set of open PR keys.
  await saveSeen(map);
  return map;
}
