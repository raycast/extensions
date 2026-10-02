import { randomUUID } from "node:crypto";
import { mkdir, open, readdir, rmdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { useCallback, useEffect, useMemo } from "react";
import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { PveServer } from "@/types";

/** The server configured through the extension preferences, kept for backwards compatibility */
export const PREFERENCES_SERVER_ID = "preferences";

/**
 * Every server is stored under its own key, so adding, editing or removing one
 * never rewrites the entries of the others.
 */
const SERVER_KEY_PREFIX = "pve-server:";

/** Servers used to be stored as a single array, migrated on the first read */
const LEGACY_SERVERS_KEY = "pve-servers";

/** `addedAt` only exists to keep the list in a stable order */
type StoredServer = PveServer & { addedAt: number };

// Keeps every mounted useServers() instance in sync when one of them writes
const changeListeners = new Set<() => void>();

function notifyServersChanged() {
  for (const listener of changeListeners) {
    listener();
  }
}

function storageKey(id: string): string {
  return `${SERVER_KEY_PREFIX}${id}`;
}

async function writeStoredServer(server: StoredServer) {
  await LocalStorage.setItem(storageKey(server.id), JSON.stringify(server));
}

/**
 * Command instances do not share module state, and LocalStorage has no CAS, so
 * overlapping update/remove of one server is coordinated with an exclusive
 * lock directory under the extension support path. Legacy migration writes those
 * same keys and must take the same per-server lock.
 *
 * The lock is a directory plus a uniquely named token file. Release and stale
 * reclaim only unlink tokens they own or that are still stale, then rmdir if
 * empty, so neither a finishing owner nor a delayed reclaim can delete a
 * replacement command's lock.
 */
const LOCK_DIR = "server-locks";
const LOCK_STALE_MS = 8_000;
const LOCK_WAIT_MS = 5_000;
const LEGACY_MIGRATION_LOCK_ID = "legacy-migration";

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function serverLockPath(id: string): string {
  const safeId = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(environment.supportPath, LOCK_DIR, `${safeId}.lock`);
}

async function newestLockActivity(lockPath: string): Promise<number | undefined> {
  let info;
  try {
    info = await stat(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return undefined;
    }
    throw error;
  }

  if (!info.isDirectory()) {
    return info.mtimeMs;
  }

  let entries: string[];
  try {
    entries = await readdir(lockPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return undefined;
    }
    throw error;
  }

  // Seed with the directory mtime so the window between mkdir and the token
  // file is not treated as immediately stale (mtime 0 is the Unix epoch).
  let newest = info.mtimeMs;
  for (const entry of entries) {
    try {
      const { mtimeMs } = await stat(join(lockPath, entry));
      newest = Math.max(newest, mtimeMs);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
  return newest;
}

async function reclaimStaleLock(lockPath: string): Promise<void> {
  let info;
  try {
    info = await stat(lockPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (!info.isDirectory()) {
    await unlink(lockPath).catch(() => undefined);
    return;
  }

  let entries: string[];
  try {
    entries = await readdir(lockPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const tokenPath = join(lockPath, entry);
    try {
      const { mtimeMs } = await stat(tokenPath);
      if (Date.now() - mtimeMs > LOCK_STALE_MS) {
        await unlink(tokenPath);
      }
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT" && code !== "EPERM" && code !== "EISDIR") {
        throw error;
      }
    }
  }

  await rmdir(lockPath).catch(() => undefined);
}

async function withSharedServerLock<T>(id: string, mutation: () => Promise<T>): Promise<T> {
  await mkdir(join(environment.supportPath, LOCK_DIR), { recursive: true });
  const lockPath = serverLockPath(id);
  const deadline = Date.now() + LOCK_WAIT_MS;
  const ownerToken = randomUUID();
  const tokenPath = join(lockPath, ownerToken);

  while (Date.now() < deadline) {
    try {
      await mkdir(lockPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }

      try {
        const mtimeMs = await newestLockActivity(lockPath);
        if (mtimeMs === undefined) {
          continue;
        }
        if (Date.now() - mtimeMs > LOCK_STALE_MS) {
          await reclaimStaleLock(lockPath);
          continue;
        }
      } catch (statError) {
        if ((statError as NodeJS.ErrnoException).code !== "ENOENT") {
          throw statError;
        }
      }

      await sleep(20 + Math.random() * 40);
      continue;
    }

    let heartbeat: ReturnType<typeof setInterval> | undefined;
    try {
      const handle = await open(tokenPath, "wx");
      try {
        await handle.writeFile(ownerToken);
        heartbeat = setInterval(() => {
          void handle.utimes(new Date(), new Date()).catch(() => undefined);
        }, LOCK_STALE_MS / 2);
        return await mutation();
      } finally {
        if (heartbeat) {
          clearInterval(heartbeat);
        }
        await handle.close().catch(() => undefined);
        await unlink(tokenPath).catch(() => undefined);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        continue;
      }
      throw error;
    } finally {
      await rmdir(lockPath).catch(() => undefined);
    }
  }

  throw new Error("Timed out waiting to update this server");
}

async function readStoredServer(id: string): Promise<StoredServer | undefined> {
  const raw = await LocalStorage.getItem<string>(storageKey(id));
  if (typeof raw !== "string" || raw === "") {
    return undefined;
  }

  try {
    return JSON.parse(raw) as StoredServer;
  } catch {
    return undefined;
  }
}

async function writeLegacyServerUnlessMutated(server: StoredServer) {
  await withSharedServerLock(server.id, async () => {
    if (await readStoredServer(server.id)) {
      // Keep a concurrent edit, or a value written by a previous partial migration
      return;
    }

    // Another instance already finished migrating; a missing key is then a
    // concurrent removal, not an unmigrated server.
    const legacy = await LocalStorage.getItem<string>(LEGACY_SERVERS_KEY);
    if (typeof legacy !== "string" || legacy === "") {
      return;
    }

    await writeStoredServer(server);
  });
}

async function migrateLegacyServers() {
  const raw = await LocalStorage.getItem<string>(LEGACY_SERVERS_KEY);
  if (typeof raw !== "string" || raw === "") {
    return;
  }

  // Re-read under the lock: another instance may have already migrated, and
  // the user may have edited or removed a server, since the check above.
  await withSharedServerLock(LEGACY_MIGRATION_LOCK_ID, async () => {
    const lockedRaw = await LocalStorage.getItem<string>(LEGACY_SERVERS_KEY);
    if (typeof lockedRaw !== "string" || lockedRaw === "") {
      return;
    }

    let legacyServers: StoredServer[];
    try {
      const parsed = JSON.parse(lockedRaw);
      legacyServers = Array.isArray(parsed) ? (parsed as StoredServer[]) : [];
    } catch {
      // Drop an unreadable legacy value instead of failing every read
      await LocalStorage.removeItem(LEGACY_SERVERS_KEY);
      return;
    }

    const seenIds = new Set<string>();
    const writes: Promise<void>[] = [];
    // The index keeps the order the servers were originally added in
    for (let index = 0; index < legacyServers.length; index += 1) {
      const server = legacyServers[index];
      if (typeof server?.id !== "string" || seenIds.has(server.id)) {
        continue;
      }
      seenIds.add(server.id);
      writes.push(writeLegacyServerUnlessMutated({ ...server, addedAt: index }));
    }

    try {
      await Promise.all(writes);
    } catch {
      // A write failed, so keep the legacy value and migrate again on the next
      // read instead of dropping the servers it could not write
      return;
    }

    await LocalStorage.removeItem(LEGACY_SERVERS_KEY);
  });
}

async function readStoredServers(): Promise<PveServer[]> {
  await migrateLegacyServers();

  const items = await LocalStorage.allItems();
  const storedServers: StoredServer[] = [];

  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(SERVER_KEY_PREFIX) || typeof value !== "string") {
      continue;
    }

    try {
      const server = JSON.parse(value) as StoredServer;
      if (typeof server?.id === "string") {
        storedServers.push(server);
      }
    } catch {
      // Skip a corrupted entry, the other servers still work
    }
  }

  return storedServers
    .sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0))
    .map(({ id, name, url, tokenId, tokenSecret }) => ({ id, name, url, tokenId, tokenSecret }));
}

export function isPreferencesServer(server: PveServer): boolean {
  return server.id === PREFERENCES_SERVER_ID;
}

export function serverNameFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function getPreferencesServer(): PveServer | undefined {
  const { serverUrl, tokenId, tokenSecret } = getPreferenceValues<Preferences>();
  if (!serverUrl || !tokenId || !tokenSecret) {
    return undefined;
  }

  return {
    id: PREFERENCES_SERVER_ID,
    name: serverNameFromUrl(serverUrl),
    url: serverUrl,
    tokenId,
    tokenSecret,
  };
}

export const useServers = () => {
  const { data: storedServers, isLoading, revalidate } = usePromise(readStoredServers, []);

  useEffect(() => {
    changeListeners.add(revalidate);
    return () => {
      changeListeners.delete(revalidate);
    };
  }, [revalidate]);

  const preferencesServer = useMemo(() => getPreferencesServer(), []);

  const servers = useMemo(() => {
    const extraServers = storedServers ?? [];
    return preferencesServer ? [preferencesServer, ...extraServers] : extraServers;
  }, [preferencesServer, storedServers]);

  const addServer = useCallback(async (server: Omit<PveServer, "id">) => {
    await writeStoredServer({ ...server, id: randomUUID(), addedAt: Date.now() });
    notifyServersChanged();
  }, []);

  const updateServer = useCallback(async (server: PveServer) => {
    // Finish migrating first so this lock and the migration writes use the
    // same order (legacy lock, then per-server lock) and cannot deadlock.
    await migrateLegacyServers();
    await withSharedServerLock(server.id, async () => {
      const stored = await readStoredServer(server.id);
      if (!stored) {
        throw new Error("This server was removed");
      }

      await writeStoredServer({ ...server, addedAt: stored.addedAt });
      notifyServersChanged();
    });
  }, []);

  const removeServer = useCallback(async (server: PveServer) => {
    await migrateLegacyServers();
    await withSharedServerLock(server.id, async () => {
      await LocalStorage.removeItem(storageKey(server.id));
      notifyServersChanged();
    });
  }, []);

  return {
    servers,
    isLoading,
    addServer,
    updateServer,
    removeServer,
  };
};
