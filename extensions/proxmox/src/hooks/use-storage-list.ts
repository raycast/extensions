import type { PveServer, PveStorage, PveStorageParsed, WithServer } from "@/types";
import { useMultiPveFetch } from "@/hooks/use-multi-pve-fetch";
import { formatStorageSize } from "@/utils/format";
import { getMockPveStorageResults } from "@/utils/mock";

export type StorageListGroup = {
  server: PveServer;
  storages: WithServer<PveStorageParsed>[];
  error?: string;
};

export const useStorageList = (mock = false) => {
  const url = "api2/json/cluster/resources";
  const search = new URLSearchParams({
    type: "storage",
  });

  const { data, servers, isLoading, revalidate } = useMultiPveFetch<PveStorage[]>(`${url}?${search.toString()}`, {
    execute: !mock,
    timerInterval: 5000,
  });

  const results = mock ? getMockPveStorageResults() : (data ?? []);
  const groups: StorageListGroup[] = results.map((result) => ({
    server: result.server,
    error: result.error,
    storages: (result.data ?? [])
      .map((storage) => ({
        ...storage,
        server: result.server,
        contentTypes: storage.content
          .split(",")
          .map((type) => type.trim())
          .filter((type) => type !== "")
          .sort((a, b) => a.localeCompare(b)),
        maxdiskParsed: formatStorageSize(storage.maxdisk),
      }))
      .sort((a, b) => a.storage.localeCompare(b.storage)),
  }));

  const hasServers = mock || servers.length > 0;

  return {
    isLoading: !mock && isLoading,
    groups,
    hasServers,
    revalidate,
  };
};
