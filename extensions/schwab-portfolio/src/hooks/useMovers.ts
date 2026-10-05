import { useCachedPromise } from "@raycast/utils";
import { getMovers } from "../lib/schwab-client";
import { normalizeMovers } from "../lib/movers";
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

        return {
          ...normalizeMovers([...(up.screeners ?? []), ...(down.screeners ?? [])]),
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
