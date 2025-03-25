import { BAIDU_TENAPI } from "../utils/constants";
import { Trend } from "../types/types";
import { useCachedPromise } from "@raycast/utils";
import { fetchTrend } from "../utils/common-utils";

export function useBaidu() {
  return useCachedPromise(() => {
    return fetchTrend(BAIDU_TENAPI) as Promise<Trend[]>;
  });
}
