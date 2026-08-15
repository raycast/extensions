import { LocalStorage } from "@raycast/api";
import { stat } from "node:fs/promises";

const UPLOAD_CACHE_KEY = "voice-clone-upload-cache-v1";
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 32;

interface CacheRecord {
  fileId: number;
  purpose: string;
  size: number;
  mtimeMs: number;
  cachedAt: number;
}

type CacheStore = Record<string, CacheRecord>;

async function loadStore(): Promise<CacheStore> {
  const raw = await LocalStorage.getItem<string>(UPLOAD_CACHE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CacheStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveStore(store: CacheStore): Promise<void> {
  await LocalStorage.setItem(UPLOAD_CACHE_KEY, JSON.stringify(store));
}

function makeKey(filePath: string, purpose: string): string {
  return `${purpose}::${filePath}`;
}

export async function lookupUploadCache(filePath: string, purpose: string): Promise<number | null> {
  let stats: Awaited<ReturnType<typeof stat>>;
  try {
    stats = await stat(filePath);
  } catch {
    return null;
  }

  const store = await loadStore();
  const record = store[makeKey(filePath, purpose)];
  if (!record) return null;

  const fresh = Date.now() - record.cachedAt < TTL_MS;
  const matches = record.size === stats.size && Math.floor(record.mtimeMs) === Math.floor(stats.mtimeMs);
  if (!fresh || !matches) return null;
  return record.fileId;
}

export async function rememberUploadCache(filePath: string, purpose: string, fileId: number): Promise<void> {
  let stats: Awaited<ReturnType<typeof stat>>;
  try {
    stats = await stat(filePath);
  } catch {
    return;
  }

  const store = await loadStore();
  store[makeKey(filePath, purpose)] = {
    fileId,
    purpose,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
    cachedAt: Date.now(),
  };

  // Prune oldest entries if we exceed the limit.
  const entries = Object.entries(store);
  if (entries.length > MAX_ENTRIES) {
    entries
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt)
      .slice(0, entries.length - MAX_ENTRIES)
      .forEach(([key]) => {
        delete store[key];
      });
  }

  await saveStore(store);
}
