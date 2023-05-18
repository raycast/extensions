import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { Task, getFilterTasks } from "../api";

import { useCachedState } from "@raycast/utils";

import { SyncData } from "../api";

function useCachedFiltered() {
  return useCachedState<Task[]>("filter_tasks");
}


export default function useFilterTasks(filter: string = "") {
  console.log(filter)
  const { data: filterData, ...rest } = usePromise(async () => {
    const data = await getFilterTasks(filter);
    return data as Task[];
  });
  const [cachedData, setCachedData] = useCachedFiltered();

  useEffect(() => {
    if (filterData) {
      setCachedData(filterData);
    }
  }, [filterData]);

  return { data: cachedData, ...rest };
}
