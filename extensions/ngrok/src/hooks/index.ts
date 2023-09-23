import { usePromise } from "@raycast/utils";

import { fetchDomains, fetchTunnels } from "../api";

export function useTunnels() {
  return usePromise(fetchTunnels);
}

export function useReservedDomains() {
  return usePromise(fetchDomains);
}
