import { useCachedPromise } from "@raycast/utils";
import { fetchTopRates } from "../api/client";

export function useTopRates(from: string, to: string, limit = 10) {
  return useCachedPromise(fetchTopRates, [from, to, limit], {
    keepPreviousData: true,
    execute: !!from && !!to,
  });
}
