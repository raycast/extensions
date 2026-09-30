import { useCachedPromise } from "@raycast/utils";
import type { MatchDayResponse } from "@/types/match-day";
import { fetchMatchDayJson } from "@/utils/fotmob-client";

export function useMatchDay(date: Date) {
  const { data, error, isLoading } = useCachedPromise(
    async (date): Promise<MatchDayResponse> => {
      return fetchMatchDayJson<MatchDayResponse>(date);
    },
    [date],
  );

  return { data, error, isLoading };
}
