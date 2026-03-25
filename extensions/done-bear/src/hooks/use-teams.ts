import { useCachedPromise } from "@raycast/utils";
import { paginateGraphql } from "../api/client";
import { TEAMS_QUERY } from "../api/queries";
import type { TeamRecord } from "../api/types";

export function useTeams(workspaceId: string | null) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (wId: string) =>
      paginateGraphql<TeamRecord>({
        query: TEAMS_QUERY,
        variables: { workspaceId: wId },
        nodeKey: "teams",
      }),
    [workspaceId || ""],
    { execute: !!workspaceId },
  );

  return { teams: data || [], isLoading, error, revalidate };
}
