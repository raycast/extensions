import { LocalStorage } from "@raycast/api";
import { Session } from "./types";

/** Bump on breaking changes to the Session schema. */
const CACHE_VERSION = "1";
const CACHE_VERSION_KEY = "claudeSessions.cacheVersion";
const SESSION_KEY_PREFIX = "claudeSessions.session:";

interface CachedEntry {
  session: Session;
  cachedMtime: number;
}

// Memoise the version-check promise so concurrent callers all wait for the same in-flight check
// instead of each kicking off their own LocalStorage round-trip (which can race on first run).
let versionCheckPromise: Promise<void> | null = null;

async function ensureCacheVersion(): Promise<void> {
  if (versionCheckPromise) return versionCheckPromise;
  versionCheckPromise = (async () => {
    const current = await LocalStorage.getItem<string>(CACHE_VERSION_KEY);
    if (current !== CACHE_VERSION) {
      // Don't use LocalStorage.clear() — it would also wipe useCachedPromise's internal cache.
      // Selectively remove our own session entries from the previous schema version.
      const allItems = await LocalStorage.allItems();
      await Promise.all(
        Object.keys(allItems)
          .filter((key) => key.startsWith(SESSION_KEY_PREFIX))
          .map((key) => LocalStorage.removeItem(key)),
      );
      await LocalStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
    }
  })();
  return versionCheckPromise;
}

export async function getCachedSession(uuid: string, currentMtime: number): Promise<Session | null> {
  await ensureCacheVersion();
  const raw = await LocalStorage.getItem<string>(SESSION_KEY_PREFIX + uuid);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CachedEntry;
    if (parsed.cachedMtime !== currentMtime) return null;
    return parsed.session;
  } catch {
    return null;
  }
}

export async function setCachedSession(uuid: string, session: Session, mtime: number): Promise<void> {
  const entry: CachedEntry = { session, cachedMtime: mtime };
  try {
    await LocalStorage.setItem(SESSION_KEY_PREFIX + uuid, JSON.stringify(entry));
  } catch {
    // LocalStorage write can fail under heavy concurrent load — better to lose a cache write than crash.
  }
}
