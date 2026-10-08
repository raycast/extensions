import { usePromise } from "@raycast/utils";
import { getCacheValue } from "../utils/cache";
import { DataSet } from "../types";
import { useRef } from "react";
import { listSets } from "../api/service";

export const useCachedDataSets = () => {
  //@ts-expect-error React issue, this works fine
  const abortable = useRef<AbortController>();

  const { data, ...rest } = usePromise(
    async () => {
      const cacheId = "sets";
      const cached = getCacheValue<DataSet>(cacheId);

      if (cached.useCache) {
        return cached.data;
      }

      const data = await listSets(abortable?.current?.signal);
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
    ...rest,
    data: data ?? [],
  };
};
