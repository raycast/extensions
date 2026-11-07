import { environment } from "@raycast/api";
import { markDataReady } from "../helpers/profiling";
import { useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { Issue } from "../api/classroom";
import { getAccountEmail } from "../api/googleAuth";
import { LoadOptions } from "../api/listClient";

// Shows what was loaded last time right away and brings it up to date in the background, so that opening
// a view never waits on Google. `key` names the query, its last result is kept per account and dependencies.
export function useClassroomQuery<T>(
  key: string,
  load: (options: LoadOptions & { issues: Issue[] }) => Promise<T>,
  dependencies: unknown[] = [],
  execute = true,
  timingLabel?: string,
) {
  const force = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const query = useCachedPromise(
    async (...args: unknown[]) => {
      void args;
      const options = { force: force.current, issues: [] as Issue[] };
      force.current = false;
      const started = performance.now();
      const data = await load(options);
      if (timingLabel && environment.isDevelopment) {
        console.log(
          "[Classroom timing] " +
            JSON.stringify({ phase: "data-load", view: timingLabel, ms: performance.now() - started }),
        );
        markDataReady(timingLabel);
      }
      return { data, issues: options.issues };
    },
    [key, getAccountEmail(), ...dependencies],
    { execute, keepPreviousData: true },
  );

  return {
    data: query.data?.data,
    // The parts that couldn't be loaded, next to the data that could
    issues: query.data?.issues ?? [],
    error: query.error,
    // Only when there is nothing to show yet, or when the user asked for a refresh and expects to see it happen
    isLoading: query.isLoading && (query.data === undefined || isRefreshing),
    refresh: async () => {
      force.current = true;
      setIsRefreshing(true);
      try {
        await query.revalidate();
      } finally {
        setIsRefreshing(false);
      }
    },
  };
}
