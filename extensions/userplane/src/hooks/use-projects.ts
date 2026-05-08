import { useCachedPromise } from "@raycast/utils";

import { api } from "../api/client";
import { reportApiError } from "../api/errors";
import { PAGINATION_LIMITS } from "../api/pagination";

export function useProjects(workspaceId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      return api.projects.list(id, { per_page: PAGINATION_LIMITS.projects });
    },
    [workspaceId ?? ""],
    {
      execute: Boolean(workspaceId),
      keepPreviousData: true,
      onError: reportApiError,
    },
  );
}
