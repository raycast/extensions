import { LocalStorage } from "@raycast/api";
import { clearDiscoveredCache } from "./discovered";
import { clearSharedIndexCache } from "./shared-index";
import { clearUsageCache } from "./usage-cache";

/** Counts of extension data removed from Raycast storage. */
export type Erased = {
  visits: number;
  pins: number;
  searches: number;
  abbreviations: number;
  /** Keys in local storage, including any this build does not know about. */
  keys: number;
  /** From the two caches whose size is measurable. */
  cacheBytes: number;
};

function countEntries(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    // Visit logs nest records under items; other values are plain collections.
    const items =
      parsed && typeof parsed === "object" && "items" in parsed
        ? (parsed as { items: unknown }).items
        : parsed;
    return items && typeof items === "object" ? Object.keys(items).length : 0;
  } catch {
    return 0;
  }
}

/** Formats deletion counts for both entry points. */
export function describeErased(erased: Erased): string {
  const counts = [
    `${erased.visits} ranked items`,
    `${erased.pins} pins`,
    `${erased.searches} searches`,
    `${erased.abbreviations} learned shortcuts`,
  ].join(", ");
  return erased.cacheBytes > 0
    ? `${counts}, and ${Math.round(erased.cacheBytes / 1024)} KB of index`
    : counts;
}

/** Clears all extension-owned Raycast storage without touching user files. */
export async function eraseEverything(): Promise<Erased> {
  const items = await LocalStorage.allItems();

  const erased: Erased = {
    visits: countEntries(items["visits"]),
    pins: countEntries(items["pins"]),
    searches: countEntries(items["searches"]),
    abbreviations: countEntries(items["abbreviations"]),
    keys: Object.keys(items).length,
    cacheBytes: 0,
  };

  await LocalStorage.clear();
  erased.cacheBytes = clearDiscoveredCache() + clearSharedIndexCache();
  clearUsageCache();

  return erased;
}
