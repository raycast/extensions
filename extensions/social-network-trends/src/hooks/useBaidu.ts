import { useCachedPromise } from "@raycast/utils";
import { Trend } from "../types/types";
import { fetchTophubTrend } from "../utils/common-utils";
import { BAIDU_HASHID } from "../utils/constants";

export function useBaidu() {
  return useCachedPromise(() => {
    return fetchTophubTrend(BAIDU_HASHID) as Promise<Trend[]>;
  });
}
