import { useCachedPromise } from "@raycast/utils";
import { Trend } from "../types/types";
import { fetchTophubTrend } from "../utils/common-utils";
import { WEIXIN_HASHID } from "../utils/constants";

export function useWeixin() {
  return useCachedPromise(() => {
    return fetchTophubTrend(WEIXIN_HASHID) as Promise<Trend[]>;
  });
}
