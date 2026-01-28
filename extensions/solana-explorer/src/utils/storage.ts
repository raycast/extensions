import { LocalStorage } from "@raycast/api";
import { Cluster } from "@solana/web3.js";
import { SolType } from "./explorerResolver";

export interface StorageItem {
  data: string;
  lastUsed: number;
  type: SolType;
  cluster: Cluster;
}

export const putInStorage = (data: string, type: SolType, cluster: Cluster) => {
  LocalStorage.setItem(data, JSON.stringify({ lastUsed: Date.now(), type, cluster }));
};

export const getPreviousSearches = () => {
  return LocalStorage.allItems()
    .then((items) =>
      Object.entries(items).map(([data, meta]) => {
        meta = JSON.parse(meta);
        return { data, lastUsed: meta.lastUsed, type: meta.type, cluster: meta.cluster };
      }),
    )
    .then((items) => items.sort((i1, i2) => i2.lastUsed - i1.lastUsed));
};

export const clearLastRecords = async (nToLeft: number, excludeRecord?: string) => {
  const storageItems = await getPreviousSearches();

  if (storageItems.length <= nToLeft) {
    return;
  }

  let startPositionToDelete = nToLeft;
  if (excludeRecord !== null && storageItems.slice(startPositionToDelete).some((it) => it.data === excludeRecord)) {
    startPositionToDelete++;
  }

  storageItems.slice(startPositionToDelete).forEach((it) => LocalStorage.removeItem(it.data));
};
