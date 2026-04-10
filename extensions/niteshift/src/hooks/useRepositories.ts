import { useCachedPromise } from "@raycast/utils";
import type { ApiClient } from "../api/client";
import type { Repository } from "../api/types";

export function useRepositories(client: ApiClient) {
  return useCachedPromise(
    async () => {
      const res = await client.get<{ repositories?: Repository[] }>("/api/github/repositories");
      const repos = res.repositories ?? [];
      // Sort alphabetically by fullName for a deterministic order — see open question §14.3 in spec.
      return [...repos].sort((a, b) => a.fullName.localeCompare(b.fullName));
    },
    [],
    { keepPreviousData: true },
  );
}
