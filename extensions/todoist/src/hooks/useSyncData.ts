import { usePromise } from "@raycast/utils";
import { useEffect } from "react";

import { SyncData, SyncResourceType, initialSync } from "../api";

import useCachedData from "./useCachedData";

export default function useSyncData(shouldSync = true, resourceTypes?: SyncResourceType[]) {
  const { data: syncData, ...rest } = usePromise(
    async (resourceTypes?: SyncResourceType[]) => {
      if (shouldSync) {
        const data = await initialSync(resourceTypes);
        return data as SyncData;
      }
    },
    [resourceTypes],
    { failureToastOptions: { title: "Unable to get Todoist data" } },
  );

  const [cachedData, setCachedData] = useCachedData();

  useEffect(() => {
    if (syncData) {
      setCachedData(syncData);
    }
  }, [syncData, setCachedData]);

  return { data: cachedData, setData: setCachedData, ...rest };
}
