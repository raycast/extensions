import { randomUUID } from "node:crypto";
import { useCallback, useEffect, useMemo } from "react";
import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import type { PveServer } from "@/types";

/** The server configured through the extension preferences, kept for backwards compatibility */
export const PREFERENCES_SERVER_ID = "preferences";

const SERVERS_STORAGE_KEY = "pve-servers";

// Keeps every mounted useServers() instance in sync when one of them writes
const changeListeners = new Set<() => void>();

function notifyServersChanged() {
  for (const listener of changeListeners) {
    listener();
  }
}

async function readStoredServers(): Promise<PveServer[]> {
  const raw = await LocalStorage.getItem<string>(SERVERS_STORAGE_KEY);
  if (typeof raw !== "string" || raw === "") {
    return [];
  }

  try {
    const servers = JSON.parse(raw);
    return Array.isArray(servers) ? servers : [];
  } catch {
    return [];
  }
}

async function writeStoredServers(servers: PveServer[]) {
  await LocalStorage.setItem(SERVERS_STORAGE_KEY, JSON.stringify(servers));
  notifyServersChanged();
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
    const current = await readStoredServers();
    await writeStoredServers([...current, { ...server, id: randomUUID() }]);
  }, []);

  const updateServer = useCallback(async (server: PveServer) => {
    const current = await readStoredServers();
    await writeStoredServers(current.map((item) => (item.id === server.id ? server : item)));
  }, []);

  const removeServer = useCallback(async (server: PveServer) => {
    const current = await readStoredServers();
    await writeStoredServers(current.filter((item) => item.id !== server.id));
  }, []);

  return {
    servers,
    isLoading,
    addServer,
    updateServer,
    removeServer,
  };
};
