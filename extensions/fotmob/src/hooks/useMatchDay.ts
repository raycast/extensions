import { useCachedPromise } from "@raycast/utils";
import type { MatchDayResponse } from "@/types/match-day";
import { getHeaderToken } from "@/utils/token";

export function useMatchDay(date: Date) {
  const { data, error, isLoading } = useCachedPromise(
    async (date): Promise<MatchDayResponse> => {
      const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
      const url = `https://www.fotmob.com/api/matches?date=${dateStr}`;
      const headers = await getHeaderToken();
      const searchResponse = await fetch(url, { headers });

      if (!searchResponse.ok) {
        throw new Error("Failed to fetch search results");
      }

      const response: MatchDayResponse = (await searchResponse.json()) as MatchDayResponse;
      return response;
    },
    [date],
  );

  return { data, error, isLoading };
}
