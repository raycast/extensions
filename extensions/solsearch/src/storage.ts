import { parseInput, SolType } from "./inputParser";
import { preferences } from "./preferences";
import { LocalStorage } from "@raycast/api";

/**
 * Stored record in LocalStorage
 * @field data key
 * @field lastUsed value
 */
export class StorageItem {
  data: string;
  lastUsed: number;

  constructor(data: string, lastUsed: number) {
    this.data = data;
    this.lastUsed = lastUsed;
  }
}

/**
 * Returns all records from LocalStorage (also sort it by LRU principle)
 */
export async function getPreviousSearches(): Promise<StorageItem[]> {
  return LocalStorage.allItems()
    .then((all) => Object.entries(all).map((it) => new StorageItem(it[0], it[1])))
    .then((items) => items.sort((i1, i2) => i2.lastUsed - i1.lastUsed));
}

/**
 * Put record to LocalStorage
 * @param data record to save
 */
export async function putIfNotUnknown(data: string) {
  const solType = parseInput(data);
  if (solType === SolType.UNKNOWN) {
    return;
  }

  await clearLastRecords(preferences().maxStorage - 1, data);
  await LocalStorage.setItem(data, Date.now());
}

/**
 * Removes last records from LocalStorage
 * @param nToLeft records to delete
 * @param excludeRecord if set - removes additional record in case if this in group for deletion
 */
async function clearLastRecords(nToLeft: number, excludeRecord?: string) {
  const storageItems = await getPreviousSearches();

  if (storageItems.length <= nToLeft) {
    return;
  }

  let startPositionToDelete = nToLeft;
  if (excludeRecord !== null && storageItems.slice(startPositionToDelete).some((it) => it.data === excludeRecord)) {
    startPositionToDelete++;
  }

  storageItems.slice(startPositionToDelete).forEach((it) => LocalStorage.removeItem(it.data));
}
