import { LocalStorage } from "@raycast/api";
import { strToU8, strFromU8, zlibSync, unzlibSync } from "fflate";
import type { FileSystemIndex, Volume } from "../types";

const CACHE_DATA_KEY = "disk-index-data-v1";
const CACHE_FLAG_KEY = "disk-index-flag-v1";

type CachePayload = {
  fsIndex: FileSystemIndex;
  volume: Volume;
};

export const isSnapshotAvailable = async (): Promise<boolean> => {
  try {
    const flag = await LocalStorage.getItem<string>(CACHE_FLAG_KEY);
    return flag === "true";
  } catch {
    return false;
  }
};

export const persistSnapshot = async (fsIndex: FileSystemIndex, volume: Volume) => {
  try {
    const payload: CachePayload = { fsIndex, volume };
    const compressed = zlibSync(strToU8(JSON.stringify(payload)));
    const base64 = Buffer.from(compressed).toString("base64");

    await LocalStorage.setItem(CACHE_DATA_KEY, base64);
    await LocalStorage.setItem(CACHE_FLAG_KEY, "true");
  } catch (error) {
    console.error("Failed to persist FS snapshot", error);
  }
};

export const invalidateSnapshot = async () => {
  try {
    await LocalStorage.removeItem(CACHE_FLAG_KEY);
    await LocalStorage.removeItem(CACHE_DATA_KEY);
  } catch {
    /* empty */
  }
};

export const hydrateSnapshot = async (): Promise<CachePayload | null> => {
  try {
    const base64 = await LocalStorage.getItem<string>(CACHE_DATA_KEY);
    if (!base64) return null;

    const compressed = new Uint8Array(Buffer.from(base64, "base64"));
    const decompressed = unzlibSync(compressed);
    const json = strFromU8(decompressed);
    return JSON.parse(json);
  } catch (error) {
    console.error("Failed to restore FS snapshot", error);
    await invalidateSnapshot();
    return null;
  }
};
