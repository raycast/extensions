import { WEIBO_TENAPI } from "../utils/constants";
import { Trend } from "../types/types";
import { useCachedPromise } from "@raycast/utils";
import { fetchTrend } from "../utils/common-utils";

export function useWeibo() {
  return useCachedPromise(() => {
    return fetchTrend(WEIBO_TENAPI) as Promise<Trend[]>;
  });
}
