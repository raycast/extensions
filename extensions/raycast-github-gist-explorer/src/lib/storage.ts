import { LocalStorage } from "@raycast/api";
import {
  CachePayload,
  SearchDocument,
  SyncMetadata,
  GistRecord,
} from "./types";

const CACHE_KEY = "gists.cache.v2";

type StoredCachePayload = {
  gists: GistRecord[];
  documents: SearchDocument[];
  metadata: SyncMetadata;
};

export async function loadCache(): Promise<CachePayload | null> {
  const raw = await LocalStorage.getItem<string>(CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredCachePayload;
  } catch {
    await LocalStorage.removeItem(CACHE_KEY);
    return null;
  }
}

export async function saveCache(payload: CachePayload): Promise<void> {
  await LocalStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export async function clearCache(): Promise<void> {
  await LocalStorage.removeItem(CACHE_KEY);
}
