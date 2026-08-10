import { Profile, Run, RunVal } from "../types";
import { useUserVals } from "./useUserVals";

// the v1 api had a /me/runs enpoint to get the recent runs. It's temporarly being removed so this behaves a bit differently. At the moment it will:
// 1. Fetch the firat 100 user vals
// 2. Sort by last run
// 3. Return the latest 10 runs
// Check commit history for the old implementation
export const useRuns = (userId?: Profile["id"]) => {
  const { vals, isLoading } = useUserVals(userId);
  const runs: Run[] = (vals ?? [])
    ?.map((val) => ({
      id: val.id,
      error: null,
      parentId: val.id,
      runEndAt: val.runEndAt,
      runStartAt: val.runStartAt,
      val: val as RunVal,
    }))
    .sort((a, b) => {
      // sort by runstartat, which are Date objects
      if (a.runStartAt > b.runStartAt) return -1;
      if (a.runStartAt < b.runStartAt) return 1;
      return 0;
    });

  return { isLoading, runs };
};
