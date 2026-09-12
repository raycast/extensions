import { useCachedPromise } from "@raycast/utils";

import { api } from "../api/client";
import { reportApiError } from "../api/errors";
import { PAGINATION_LIMITS } from "../api/pagination";

export function useDomains(workspaceId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      return api.domains.list(id, { per_page: PAGINATION_LIMITS.domains });
    },
    [workspaceId ?? ""],
    {
      execute: Boolean(workspaceId),
      keepPreviousData: true,
      onError: reportApiError,
    },
  );
}
