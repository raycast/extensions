import { useCachedPromise } from "@raycast/utils";
import fetch from "cross-fetch";
import { MatchDayResponse } from "../types/match-day";

export function useMatchDay(date: Date) {
  const { data, error, isLoading } = useCachedPromise(
    async (date): Promise<MatchDayResponse> => {
      const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
      const url = `https://www.fotmob.com/api/matches?date=${dateStr}`;
      const searchResponse = await fetch(url);

      if (!searchResponse.ok) {
        throw new Error("Failed to fetch search results");
      }

      const response: MatchDayResponse = await searchResponse.json();
      return response;
    },
    [date]
  );

  return { data, error, isLoading };
}
