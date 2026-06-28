import { useCachedState } from "@raycast/utils";

import { SyncData } from "../api";

export default function useCachedData() {
  return useCachedState<SyncData>("data");
}
