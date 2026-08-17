import { randomUUID } from "node:crypto";
import { useCallback, useEffect, useMemo } from "react";
import { LocalStorage, getPreferenceValues } from "@raycast/api";
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
 * LocalStorage has no compare-and-swap, so overlapping update/remove of the
 * same key must run one at a time. Per-server keys already isolate different
 * servers; this queue only serializes mutations that share an id.
 */
const mutationQueues = new Map<string, Promise<unknown>>();

function enqueueServerMutation<T>(id: string, mutation: () => Promise<T>): Promise<T> {
  const previous = mutationQueues.get(id) ?? Promise.resolve();
  const result = previous.then(mutation, mutation);
  const settled = result.then(
    () => undefined,
    () => undefined,
  );
  mutationQueues.set(id, settled);
  void settled.then(() => {
    if (mutationQueues.get(id) === settled) {
      mutationQueues.delete(id);
    }
  });
  return result;
}

async function migrateLegacyServers() {
  const raw = await LocalStorage.getItem<string>(LEGACY_SERVERS_KEY);
  if (typeof raw !== "string" || raw === "") {
    return;
  }

  try {
    const legacyServers = JSON.parse(raw);
    if (Array.isArray(legacyServers)) {
      // The index keeps the order the servers were originally added in
      await Promise.all(
        legacyServers
          .filter((server) => typeof server?.id === "string")
          .map((server, index) => writeStoredServer({ ...server, addedAt: index })),
      );
    }
  } catch {
    // Drop an unreadable legacy value instead of failing every read
  }

  await LocalStorage.removeItem(LEGACY_SERVERS_KEY);
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
    await enqueueServerMutation(server.id, async () => {
      const stored = await readStoredServer(server.id);
      if (!stored) {
        throw new Error("This server was removed");
      }

      await writeStoredServer({ ...server, addedAt: stored.addedAt });
      notifyServersChanged();
    });
  }, []);

  const removeServer = useCallback(async (server: PveServer) => {
    await enqueueServerMutation(server.id, async () => {
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
