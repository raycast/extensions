import { useCachedPromise } from "@raycast/utils";
import { fetchPopularDirections } from "../api/client";

export function usePopularDirections(limit = 30) {
  return useCachedPromise(fetchPopularDirections, [limit], {
    keepPreviousData: true,
  });
}
