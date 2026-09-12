import { BILI_TENAPI } from "../utils/constants";
import { Trend } from "../types/types";
import { useCachedPromise } from "@raycast/utils";
import { fetchTrend } from "../utils/common-utils";

export function useBili() {
  return useCachedPromise(() => {
    return fetchTrend(BILI_TENAPI) as Promise<Trend[]>;
  });
}
