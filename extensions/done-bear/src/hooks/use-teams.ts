import { useCachedPromise } from "@raycast/utils";

import { paginateGraphql } from "../api/client";
import { TEAMS_QUERY } from "../api/queries";
import type { TeamRecord } from "../api/types";

export const useTeams = (workspaceId: string | null) => {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (wId: string) =>
      paginateGraphql<TeamRecord>({
        nodeKey: "teams",
        query: TEAMS_QUERY,
        variables: { workspaceId: wId },
      }),
    [workspaceId || ""],
    { execute: !!workspaceId },
  );

  return { error, isLoading, revalidate, teams: data || [] };
};
