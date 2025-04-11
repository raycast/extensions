import { useCachedPromise } from "@raycast/utils";
import { Trend } from "../types/types";
import { fetchTophubTrend } from "../utils/common-utils";
import { PENGPAI_HASHID } from "../utils/constants";

export function usePengpai() {
  return useCachedPromise(() => {
    return fetchTophubTrend(PENGPAI_HASHID) as Promise<Trend[]>;
  });
}
