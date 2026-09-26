import { LocalStorage } from "@raycast/api";
import { clearLegacyCaches } from "./discovered";
import { formatSize } from "./format";
import { clearUsageCache } from "./usage-cache";
import { deleteIndexDatabase } from "./index-db";
import { closeIndexReader } from "./index-reader";
import { searchIndexPath } from "./index-rebuild";
import { withIndexingLock } from "./indexing-lock";
import { invalidateData, withStorageLock } from "./storage-lock";

/** Counts of extension data removed from Raycast storage. */
export type Erased = {
  visits: number;
  pins: number;
  searches: number;
  abbreviations: number;
  /** From the caches whose size is measurable. */
  cacheBytes: number;
};

function countEntries(raw: unknown): number {
  if (typeof raw !== "string") return 0;
  try {
    const parsed = JSON.parse(raw);
    // Visit logs nest records under items; other values, arrays included, are
    // plain collections, and Object.keys counts an array's own indices.
    const items =
      parsed && typeof parsed === "object" && "items" in parsed
        ? (parsed as { items: unknown }).items
        : parsed;
    return items && typeof items === "object" ? Object.keys(items).length : 0;
  } catch {
    return 0;
  }
}

/**
 * Formats deletion counts for both entry points.
 *
 * Counts are coerced, because a collection step that failed used to reach the
 * user's toast as "undefined ranked items". Sizes go through formatSize, which
 * says "512 B" where rounding to whole kilobytes said "0 KB of index".
 */
function count(n: number, one: string, many: string): string {
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe} ${safe === 1 ? one : many}`;
}

export function describeErased(erased: Erased): string {
  const counts = [
    count(erased.visits, "ranked item", "ranked items"),
    count(erased.pins, "pin", "pins"),
    count(erased.searches, "search", "searches"),
    count(erased.abbreviations, "learned shortcut", "learned shortcuts"),
  ].join(", ");
  return erased.cacheBytes > 0
    ? `${counts}, and ${formatSize(erased.cacheBytes)} of index`
    : counts;
}

/** Clears all extension-owned Raycast storage without touching user files. */
export async function eraseEverything(): Promise<Erased | undefined> {
  return withIndexingLock(async (assertOwned) => {
    return withStorageLock(async (assertCurrent) => {
      const items = await LocalStorage.allItems();

      const erased: Erased = {
        visits: countEntries(items["visits"]),
        pins: countEntries(items["pins"]),
        searches: countEntries(items["searches"]),
        abbreviations: countEntries(items["abbreviations"]),
        cacheBytes: 0,
      };

      assertOwned();
      assertCurrent();
      invalidateData();
      await LocalStorage.clear();
      assertOwned();
      assertCurrent();
      // Close the reader first: deleting a file a connection still holds
      // would leave the next query reading a database that is no longer there.
      closeIndexReader();
      erased.cacheBytes =
        clearLegacyCaches() + deleteIndexDatabase(searchIndexPath());
      clearUsageCache();

      return erased;
    }, undefined);
  }, "deletion");
}
