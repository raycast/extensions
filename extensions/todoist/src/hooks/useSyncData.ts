import { usePromise } from "@raycast/utils";
import { useEffect } from "react";

import { SyncData, initialSync } from "../api";

import useCachedData from "./useCachedData";

export default function useSyncData(shouldSync = true) {
  const { data: syncData, ...rest } = usePromise(async () => {
    if (shouldSync) {
      console.log("full sync");
      const data = await initialSync();
      return data as SyncData;
    }
  });

  const [cachedData, setCachedData] = useCachedData();

  useEffect(() => {
    if (syncData) {
      setCachedData(syncData);
    }
  }, [syncData, setCachedData]);

  return { data: cachedData, setData: setCachedData, ...rest };
}
