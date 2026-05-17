import { usePromise } from "@raycast/utils";
import { useEffect } from "react";

import { SyncData, SyncResourceType, initialSync } from "../api";

import useCachedData from "./useCachedData";

const EMPTY_SYNC_DATA_FIELDS: Pick<
  SyncData,
  "collaborator_states" | "filters" | "locations" | "notes" | "reminders" | "sections"
> = {
  collaborator_states: [],
  filters: [],
  locations: [],
  notes: [],
  reminders: [],
  sections: [],
};

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
      setCachedData((cachedData) =>
        cachedData ? { ...cachedData, ...syncData } : ({ ...EMPTY_SYNC_DATA_FIELDS, ...syncData } as SyncData),
      );
    }
  }, [syncData, setCachedData]);

  return { data: cachedData, setData: setCachedData, ...rest };
}
