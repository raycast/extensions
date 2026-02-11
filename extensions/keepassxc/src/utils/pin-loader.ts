import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getEntryId } from "./entry-helper";

class PinLoader {
  private static pinnedStorageKey: string = `pinnedEntries_${getPreferenceValues().database}`;

  /**
   * Load the pinned entry IDs from `LocalStorage`
   *
   * @returns {Promise<Set<string>>} - A set of pinned entry IDs. If there are no pinned
   * entry IDs stored, it returns an empty set
   */
  public static loadPinnedIdsCache = async (): Promise<Set<string>> => {
    const stored = await LocalStorage.getItem(this.pinnedStorageKey);
    if (stored) {
      return new Set(JSON.parse(stored as string));
    }
    return new Set();
  };

  public static savePinnedIds = async (pinnedIds: Set<string>): Promise<void> => {
    await LocalStorage.setItem(this.pinnedStorageKey, JSON.stringify([...pinnedIds]));
  };

  /**
   * Remove pinned entries that no longer exist in the database
   *
   * @param entries - The list of entries in the database
   * @param pinnedIds - The set of pinned entry IDs
   * @returns {Promise<Set<string>>} - The cleaned set of pinned entry IDs
   */
  public static cleanPinnedIds = async (entries: string[][], pinnedIds: Set<string>): Promise<Set<string>> => {
    const validEntryIds = new Set(entries.map(getEntryId));
    const cleanedPinnedIds = new Set<string>();

    for (const pinnedId of pinnedIds) {
      if (validEntryIds.has(pinnedId)) {
        cleanedPinnedIds.add(pinnedId);
      }
    }

    // Only save if there were stale entries removed
    if (cleanedPinnedIds.size !== pinnedIds.size) {
      await this.savePinnedIds(cleanedPinnedIds);
    }

    return cleanedPinnedIds;
  };
}

export { PinLoader };
