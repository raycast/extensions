import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { getEntryId } from "./entry-helper";

interface Preference {
  database: string;
}

class PinLoader {
  private static pinnedStorageKey: string;
  static {
    const preferences: Preference = getPreferenceValues();
    this.pinnedStorageKey = `pinnedEntries_${preferences.database}`;
  }

  public static loadIdsCache = async (): Promise<Set<string>> => {
    const stored = await LocalStorage.getItem(this.pinnedStorageKey);
    if (stored) {
      return new Set(JSON.parse(stored as string));
    }
    return new Set();
  };

  public static saveEntries = async (pinnedIds: Set<string>): Promise<void> => {
    await LocalStorage.setItem(this.pinnedStorageKey, JSON.stringify([...pinnedIds]));
  };

  /**
   * Remove pinned entries that no longer exist in the database.
   * Returns the cleaned set of pinned IDs.
   */
  public static cleanEntries = async (entries: string[][], pinnedIds: Set<string>): Promise<Set<string>> => {
    const validEntryIds = new Set(entries.map(getEntryId));
    const cleanedPinnedIds = new Set<string>();

    for (const pinnedId of pinnedIds) {
      if (validEntryIds.has(pinnedId)) {
        cleanedPinnedIds.add(pinnedId);
      }
    }

    // Only save if there were stale entries removed
    if (cleanedPinnedIds.size !== pinnedIds.size) {
      await this.saveEntries(cleanedPinnedIds);
    }

    return cleanedPinnedIds;
  };

  public static cleanupOldPinnedEntries = async (): Promise<void> => {
    const allItems = await LocalStorage.allItems();
    const currentDbKey = this.pinnedStorageKey;

    // Remove pinned entries for databases other than current
    for (const key of Object.keys(allItems)) {
      if (key.startsWith("pinnedEntries_") && key !== currentDbKey) {
        await LocalStorage.removeItem(key);
      }
    }
  };
}

export { PinLoader };
