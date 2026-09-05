import { Cache } from "@raycast/api";
import { SharedIndex } from "./shared-scan";

/** Bulk cache for the Google Drive shared-folder index. */
const cache = new Cache({ namespace: "shared-folders", capacity: 8_000_000 });
const KEY = "index";

const EMPTY: SharedIndex = {
  paths: [],
  scannedAt: 0,
  available: false,
  partial: false,
};

export function loadSharedIndex(): SharedIndex {
  const raw = cache.get(KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as SharedIndex;
    return Array.isArray(parsed.paths)
      ? { ...parsed, available: parsed.available ?? true }
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Clears the index and returns its serialized byte count. */
export function clearSharedIndexCache(): number {
  const bytes = cache.get(KEY)?.length ?? 0;
  cache.clear({ notifySubscribers: false });
  return bytes;
}

export function saveSharedIndex(index: SharedIndex): void {
  try {
    cache.set(KEY, JSON.stringify(index));
  } catch {
    // Preserve the existing index if the replacement exceeds capacity.
  }
}
