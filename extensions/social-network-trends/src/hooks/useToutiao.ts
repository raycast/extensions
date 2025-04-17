import { useCachedPromise } from "@raycast/utils";
import { Trend } from "../types/types";
import { fetchTophubTrend } from "../utils/common-utils";
import { TOUTIAO_HASHID } from "../utils/constants";

export function useToutiao() {
  return useCachedPromise(() => {
    return fetchTophubTrend(TOUTIAO_HASHID) as Promise<Trend[]>;
  });
}
