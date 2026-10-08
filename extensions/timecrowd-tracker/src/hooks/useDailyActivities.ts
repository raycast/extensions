import { useCachedPromise } from "@raycast/utils";
import { getDailyActivity } from "@/api";

import type { Dayjs } from "dayjs";

export const useDailyActivities = (dates: Dayjs[]) => {
  const { isLoading, data, revalidate } = useCachedPromise(async () => {
    const dailyActivities = await Promise.all(dates.map((date) => getDailyActivity(date)));

    return dailyActivities;
  });

  return {
    isLoadingDailyActivities: isLoading,
    dailyActivities: data,
    revalidateDailyActivities: revalidate,
  };
};
