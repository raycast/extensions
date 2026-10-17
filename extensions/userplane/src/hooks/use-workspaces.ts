import { useCachedPromise } from "@raycast/utils";

import { api } from "../api/client";
import { reportApiError } from "../api/errors";
import { PAGINATION_LIMITS } from "../api/pagination";

export function useWorkspaces() {
  return useCachedPromise(
    async () => {
      return api.workspaces.list({
        per_page: PAGINATION_LIMITS.workspaces,
        include_workspace_membership: true,
      });
    },
    [],
    { keepPreviousData: true, onError: reportApiError },
  );
}
