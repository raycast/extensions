import { useCachedPromise } from "@raycast/utils";

import { loadUserNames } from "../api/spaces";
import type { Space } from "../api/types";

/** Display names of everyone in a space, for senders and mentions. Failures fall back to "Unknown". */
export function useUserNames(space: Space) {
  const { data } = useCachedPromise(loadUserNames, [space], {
    keepPreviousData: true,
    onError: (error) => console.error("Could not load member names", error),
  });
  return data ?? {};
}
