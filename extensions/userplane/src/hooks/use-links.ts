import { useCachedPromise } from "@raycast/utils";

import { api } from "../api/client";
import { reportApiError } from "../api/errors";
import { PAGINATION_LIMITS } from "../api/pagination";
import type { Link, LinksQuery } from "../api/types";

export interface UseLinksResult {
  data: Link[];
  hasMore: boolean;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
}

const EMPTY_QUERY: LinksQuery = {};

export function useLinks(workspaceId: string | undefined, query: LinksQuery = EMPTY_QUERY): UseLinksResult {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (wsId: string, q: LinksQuery) => {
      const result = await api.links.list(wsId, {
        page: 1,
        per_page: PAGINATION_LIMITS.links,
        created_by: q.created_by,
        project_id: q.project_id,
        domain_id: q.domain_id,
        sort_by: q.sort_by,
        sort_direction: q.sort_direction,
      });
      return {
        links: result.links,
        hasMore: result.pagination?.hasMore ?? false,
      };
    },
    [workspaceId ?? "", query],
    {
      execute: Boolean(workspaceId),
      keepPreviousData: true,
      onError: reportApiError,
    },
  );

  return {
    data: data?.links ?? [],
    hasMore: data?.hasMore ?? false,
    isLoading,
    error,
    revalidate,
  };
}
