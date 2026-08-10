import { useCachedPromise } from "@raycast/utils";
import { fetchGlobalOptions } from "../lib/api";

export default function useGlobalOptions() {
  return useCachedPromise(fetchGlobalOptions, [], {
    keepPreviousData: true,
  });
}
