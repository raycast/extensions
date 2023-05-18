import { usePromise } from "@raycast/utils";
import { useEffect } from "react";
import { Task, getFilterTasks } from "../api";
import { useCachedState } from "@raycast/utils";


function useCachedFiltered() {
  return useCachedState<Task[]>("filter_tasks");
}


export default function useFilterTasks(filter: string = "") {
  // ToDo: Only fetch if sync data has change. I didn't find how to do it since usePromise and useMemo/useEffect can't easily be nested?
  const { data: filterData, ...rest } = usePromise(async () => {
    if (filter !== "") {
        console.log("fetching filter")
        const data = await getFilterTasks(filter);
        return data as Task[];
    }
  });
  const [cachedData, setCachedData] = useCachedFiltered();

  useEffect(() => {
    if (filterData) {
      setCachedData(filterData);
    }
  }, [filterData]);

  return { data: cachedData, ...rest };
}
