import { useCachedPromise } from "@raycast/utils";
import { Trend } from "../types/types";
import { fetchTophubTrend } from "../utils/common-utils";
import { BILI_HASHID } from "../utils/constants";

export function useBili() {
  return useCachedPromise(() => {
    return fetchTophubTrend(BILI_HASHID) as Promise<Trend[]>;
  });
}
