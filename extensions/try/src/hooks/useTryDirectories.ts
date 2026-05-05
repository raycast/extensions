import { useCachedPromise } from "@raycast/utils";
import { getTryDirectories } from "../lib/utils";

export function useTryDirectories() {
  return useCachedPromise(getTryDirectories, [], {
    keepPreviousData: true,
  });
}
