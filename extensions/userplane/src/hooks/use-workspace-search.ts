import { useCachedPromise } from "@raycast/utils";

import { api } from "../api/client";
import { reportApiError } from "../api/errors";
import { SEARCH_LIMIT } from "../api/pagination";
import type { SearchType } from "../api/types";

export function useWorkspaceSearch(workspaceId: string | undefined, type: SearchType, query: string) {
  return useCachedPromise(
    async (id: string, t: SearchType, q: string) => {
      return api.search(id, { q, type: t, limit: SEARCH_LIMIT });
    },
    [workspaceId ?? "", type, query],
    {
      execute: Boolean(workspaceId && query),
      keepPreviousData: true,
      onError: reportApiError,
    },
  );
}
