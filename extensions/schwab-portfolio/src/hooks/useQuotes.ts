import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getQuotes } from "../lib/schwab-client";
import type { QuoteResponse } from "../types/quotes";

export function useQuotes(symbols: string[]) {
  const sortedSymbols = [...symbols].sort().join(",");

  return useCachedPromise(
    async (syms: string) => {
      if (!syms) return {} as QuoteResponse;
      const symbolList = syms.split(",");
      return getQuotes(symbolList);
    },
    [sortedSymbols],
    {
      keepPreviousData: true,
      execute: symbols.length > 0,
      onError: (error) => {
        void showFailureToast(error, { title: "Failed to load quotes" });
      },
    },
  );
}
