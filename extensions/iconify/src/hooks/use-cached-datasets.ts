import { usePromise } from "@raycast/utils";
import { getCacheValue } from "../utils/cache";
import { DataSet } from "../types";
import { useRef } from "react";
import { listSets } from "../api/service";

export const useCachedDataSets = () => {
  const abortable = useRef<AbortController>(new AbortController());

  const { isLoading, data } = usePromise(
    async () => {
      const cacheId = "sets";
      const cached = getCacheValue<DataSet>(cacheId);

      if (cached.useCache) {
        return cached.data;
      }

      const data = await listSets(abortable.current.signal);
      cached.setCache(data);
      return data;
    },
    [],
    {
      failureToastOptions: {
        title: "Couldn't fetch icon sets",
      },
      abortable,
    },
  );
  return {
    isLoading,
    data: data ?? [],
  };
};
