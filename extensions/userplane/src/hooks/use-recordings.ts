import { useCachedPromise } from "@raycast/utils";

import { api } from "../api/client";
import { reportApiError } from "../api/errors";
import { PAGINATION_LIMITS } from "../api/pagination";
import type { Recording, RecordingsQuery } from "../api/types";

export interface UseRecordingsResult {
  data: Recording[];
  hasMore: boolean;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
}

export function useRecordings(workspaceId: string | undefined, query: RecordingsQuery): UseRecordingsResult {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (wsId: string, q: RecordingsQuery) => {
      const result = await api.recordings.list(wsId, {
        page: 1,
        per_page: PAGINATION_LIMITS.recordings,
        created_by: q.created_by,
        project_id: q.project_id,
        link_id: q.link_id,
        sort_by: q.sort_by,
        sort_direction: q.sort_direction,
      });
      return {
        recordings: result.recordings,
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
    data: data?.recordings ?? [],
    hasMore: data?.hasMore ?? false,
    isLoading,
    error,
    revalidate,
  };
}
