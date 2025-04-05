import { useCachedPromise } from "@raycast/utils";
import { Trend } from "../types/types";
import { fetchTophubTrend } from "../utils/common-utils";
import { WEIBO_HASHID } from "../utils/constants";

export function useWeibo() {
  return useCachedPromise(() => {
    return fetchTophubTrend(WEIBO_HASHID) as Promise<Trend[]>;
  });
}
