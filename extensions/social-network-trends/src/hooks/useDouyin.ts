import { useCachedPromise } from "@raycast/utils";
import { Trend } from "../types/types";
import { fetchTophubTrend } from "../utils/common-utils";
import { DOUYIN_HASHID } from "../utils/constants";

export function useDouyin() {
  return useCachedPromise(() => {
    return fetchTophubTrend(DOUYIN_HASHID) as Promise<Trend[]>;
  });
}
