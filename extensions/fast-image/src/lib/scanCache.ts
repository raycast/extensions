import { Cache } from "@raycast/api";
import { ImageFile } from "../types";

const cache = new Cache({ namespace: "scan" });
const CACHE_KEY = "scan-result";

interface ScanCacheData {
  folder: string;
  images: ImageFile[];
}

// The scanned list is kept on disk between launches so opening the command
// never re-walks the filesystem unless the folder changed or a refresh was requested.
export function readScanCache(folder: string): ImageFile[] | null {
  const raw = cache.get(CACHE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as ScanCacheData;
    return data.folder === folder ? data.images : null;
  } catch {
    return null;
  }
}

export function writeScanCache(folder: string, images: ImageFile[]): void {
  const data: ScanCacheData = { folder, images };
  cache.set(CACHE_KEY, JSON.stringify(data));
}

export function clearScanCache(): void {
  cache.remove(CACHE_KEY);
}
