import { useCachedPromise } from "@raycast/utils";
import { normalizeMoverItems } from "../lib/movers";
import { getMovers } from "../lib/schwab-client";
import type { MoverItem } from "../types/quotes";

interface MoversResult {
  gainers: MoverItem[];
  losers: MoverItem[];
  unavailable: boolean;
}

function isUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("statusCode" in error)) return false;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 400 || statusCode === 404;
}

export function useMovers() {
  return useCachedPromise(
    async (): Promise<MoversResult> => {
      try {
        const [up, down] = await Promise.all([
          getMovers("$SPX", "PERCENT_CHANGE_UP"),
          getMovers("$SPX", "PERCENT_CHANGE_DOWN"),
        ]);

        // Schwab's sort parameter is unreliable (both calls can return mixed
        // signs), so merge, normalize, and partition by actual sign ourselves.
        const bySymbol = new Map<string, MoverItem>();
        for (const item of normalizeMoverItems([...(up.screeners ?? []), ...(down.screeners ?? [])])) {
          bySymbol.set(item.symbol, item);
        }

        const movers = Array.from(bySymbol.values());
        return {
          gainers: movers
            .filter((item) => (item.netPercentChange ?? 0) > 0)
            .sort((a, b) => (b.netPercentChange ?? 0) - (a.netPercentChange ?? 0)),
          losers: movers
            .filter((item) => (item.netPercentChange ?? 0) < 0)
            .sort((a, b) => (a.netPercentChange ?? 0) - (b.netPercentChange ?? 0)),
          unavailable: false,
        };
      } catch (error) {
        if (isUnavailableError(error)) {
          return { gainers: [], losers: [], unavailable: true };
        }
        throw error;
      }
    },
    [],
    { keepPreviousData: true },
  );
}
