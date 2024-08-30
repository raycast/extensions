import { useMemo } from "react";
import { SmartHabit } from "../types/smart-series";
import { fetcher } from "../utils/axiosPromise";
import { normalize } from "../utils/objects";
import { useSyncCachedPromise } from "./useSyncCachedPromise";

const useSmartHabits = () => {
  const {
    error,
    isLoading,
    data: smartHabits,
  } = useSyncCachedPromise<readonly SmartHabit[]>(
    "use-smart-habits",
    async () => (await fetcher<readonly SmartHabit[]>("/smart-habits")).data,
    {
      wrapError: (cause) => new Error("Error while fetching smart-habits", { cause }),
    }
  );

  const smartHabitsByLineageIdsMap = useMemo(
    () => (smartHabits ? normalize(smartHabits, "lineageId") : undefined),
    [smartHabits]
  );

  return {
    smartHabits,
    smartHabitsByLineageIdsMap,
    error,
    isLoading,
  };
};

export { useSmartHabits };
