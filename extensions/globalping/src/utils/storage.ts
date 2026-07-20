import { LocalStorage } from "@raycast/api";
import { sanitizeText } from "./text";

export interface LocationStat {
  location: string;
  count: number;
  lastUsed: number;
}

const LOCATION_STATS_KEY = "locationStats";
let locationStatsWriteQueue: Promise<void> = Promise.resolve();

/**
 * Loads, validates, and de-duplicates persisted location usage stats.
 */
export async function getLocationStats(): Promise<LocationStat[]> {
  const raw = await LocalStorage.getItem<string>(LOCATION_STATS_KEY);
  if (!raw) return [];

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const mergedByLocation = new Map<string, LocationStat>();

  for (const entry of parsed) {
    if (!entry || typeof entry.location !== "string") {
      continue;
    }

    const location = sanitizeText(entry.location);
    if (!location) {
      continue;
    }

    const normalizedLocation = location.toLowerCase();
    const existing = mergedByLocation.get(normalizedLocation);

    if (existing) {
      existing.count += Number(entry.count) || 0;
      existing.lastUsed = Math.max(existing.lastUsed, Number(entry.lastUsed) || 0);
      continue;
    }

    mergedByLocation.set(normalizedLocation, {
      location,
      count: Math.max(0, Number(entry.count) || 0),
      lastUsed: Math.max(0, Number(entry.lastUsed) || 0),
    });
  }

  return [...mergedByLocation.values()];
}

/**
 * Increments usage stats for a location while serializing writes to avoid lost updates.
 */
export async function incrementLocationStat(location: string): Promise<void> {
  const sanitizedLocation = sanitizeText(location);
  if (!sanitizedLocation) {
    return;
  }

  const updatePromise = locationStatsWriteQueue.then(async () => {
    const stats = await getLocationStats();
    const existing = stats.find((s) => s.location.toLowerCase() === sanitizedLocation.toLowerCase());
    if (existing) {
      existing.location = sanitizedLocation;
      existing.count += 1;
      existing.lastUsed = Date.now();
    } else {
      stats.push({ location: sanitizedLocation, count: 1, lastUsed: Date.now() });
    }

    await LocalStorage.setItem(LOCATION_STATS_KEY, JSON.stringify(stats));
  });

  locationStatsWriteQueue = updatePromise.catch(() => undefined);
  return updatePromise;
}
