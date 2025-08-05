import fetch from "cross-fetch";
import { useCachedPromise } from "@raycast/utils";
import type { MatchFixture, TeamDetailData } from "@/types/team-detail";
import { getHeaderToken } from "@/utils/token";

// Extend TeamDetailData
export type Data = TeamDetailData & {
  calculated: {
    upcommingMatch: MatchFixture | null;
    lastMatches: MatchFixture[];
    nextMatches: MatchFixture[];
  };
};

export function useTeamDetail(teamId: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (teamId: string): Promise<TeamDetailData> => {
      const url = `https://www.fotmob.com/api/teams?id=${teamId}`;
      const token = await getHeaderToken();

      const response = await fetch(url, { headers: token });
      if (!response.ok) {
        throw new Error("Failed to fetch team details");
      }
      const teamDetailData = (await response.json()) as TeamDetailData;
      return teamDetailData;
    },
    [teamId],
    {
      initialData: {},
    },
  );

  return { data, error, isLoading };
}
