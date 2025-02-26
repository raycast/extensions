import { useCachedPromise } from "@raycast/utils";

import { Task, getFilterTasks } from "../api";

export default function useFilterTasks(filter = "") {
  return useCachedPromise(async () => {
    if (!filter) return [];

    const data = await getFilterTasks(filter);
    return data as Task[];
  });
}
