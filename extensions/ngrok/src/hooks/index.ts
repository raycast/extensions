import { usePromise } from "@raycast/utils";

import { fetchTunnels } from "../api";

export function useTunnels() {
  return usePromise(fetchTunnels);
}
