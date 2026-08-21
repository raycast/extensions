import { useState } from "react";
import type { PveServer, PveVm, WithServer } from "@/types";
import { useMultiPveFetch } from "@/hooks/use-multi-pve-fetch";
import { getMockPveVmResults } from "@/utils/mock";

export type VmListGroup = {
  server: PveServer;
  vms: WithServer<PveVm>[];
  error?: string;
};

/**
 * Hook to get the list of VMs of every configured server
 *
 * @param mock - If true, use mock data instead of fetching from the API
 */
export const useVmList = (mock = false) => {
  const [type, setType] = useState<string>("all");

  const url = "api2/json/cluster/resources";
  const search = new URLSearchParams({
    type: "vm",
  });

  const { data, servers, isLoading, revalidate, mutate } = useMultiPveFetch<PveVm[]>(`${url}?${search.toString()}`, {
    execute: !mock,
  });

  const results = mock ? getMockPveVmResults() : (data ?? []);
  const groups: VmListGroup[] = results.map((result) => ({
    server: result.server,
    error: result.error,
    vms: (result.data ?? [])
      .filter((vm) => (type === "all" ? true : vm.type === type))
      .map((vm) => ({ ...vm, server: result.server })),
  }));

  const hasServers = mock || servers.length > 0;

  return {
    isLoading: !mock && isLoading,
    groups,
    hasServers,
    revalidate,
    mutate,
    setType,
  };
};
