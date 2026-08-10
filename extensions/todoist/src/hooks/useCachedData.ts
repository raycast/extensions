import { useCachedState } from "@raycast/utils";

import { SyncData } from "../api";

export default function useCachedData(cacheKey = "data") {
  return useCachedState<SyncData>(cacheKey);
}
