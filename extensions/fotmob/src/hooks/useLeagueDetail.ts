import { useCachedPromise } from "@raycast/utils";
import type { LeagueDetailData } from "@/types/league-detail";
import { fetchLeaguePageData } from "@/utils/fotmob-client";

export function useLeagueDetail(leagueId: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (leagueId: string): Promise<LeagueDetailData> => {
      return fetchLeaguePageData<LeagueDetailData>(leagueId);
    },
    [leagueId],
    {
      initialData: {},
    },
  );

  return { data, error, isLoading };
}
