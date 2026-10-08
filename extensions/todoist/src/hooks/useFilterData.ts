import { usePromise } from "@raycast/utils";

import { getFilterTasks } from "../api";

export default function useFilterTasks(filter = "") {
  return usePromise(
    async (filter: string) => {
      if (!filter) return [];

      const data = await getFilterTasks(filter);
      return data;
    },
    [filter],
  );
}
