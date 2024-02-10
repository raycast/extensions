import { usePromise } from "@raycast/utils";
import { useEffect } from "react";


import useCachedData from "./useCachedData";
import { ISyncData } from "@src/interface";
import { getAllConfig } from "@src/util";

export default function useConfigData(shouldSync = true) {
  const { data: syncData, ...rest } = usePromise(async () => {
    if (shouldSync) {
      console.log("full sync");
      const allConfig =  await getAllConfig() ;
      const data = {
        dbConfigs: allConfig
      }
      return data as ISyncData;
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
