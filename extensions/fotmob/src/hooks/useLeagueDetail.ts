import { useCachedPromise } from "@raycast/utils";
import type { LeagueDetailData } from "@/types/league-detail";
import { getHeaderToken } from "@/utils/token";

export function useLeagueDetail(leagueId: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (leagueId: string): Promise<LeagueDetailData> => {
      const url = `https://www.fotmob.com/api/leagues?id=${leagueId}`;
      const token = await getHeaderToken();

      const response = await fetch(url, { headers: token });
      if (!response.ok) {
        throw new Error("Failed to fetch league details");
      }
      const leagueDetailData = (await response.json()) as LeagueDetailData;
      return leagueDetailData;
    },
    [leagueId],
    {
      initialData: {},
    },
  );

  return { data, error, isLoading };
}
