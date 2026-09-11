import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { searchInstruments } from "../lib/schwab-client";

export function useInstrumentSearch(query: string) {
  const normalizedQuery = query.trim().toUpperCase();

  return useCachedPromise(
    async (q: string) => {
      const symbolResults = await searchInstruments(q, "symbol-search");
      if ((symbolResults.instruments?.length ?? 0) === 0 && q.length >= 2) {
        return searchInstruments(q, "desc-search");
      }
      return symbolResults;
    },
    [normalizedQuery],
    {
      keepPreviousData: true,
      execute: normalizedQuery.length >= 2,
      onError: (error) => {
        void showFailureToast(error, { title: "Failed to search instruments" });
      },
    },
  );
}
