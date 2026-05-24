import { useCCUsageWeeklyCli } from "./useCCUsageWeeklyCli";
import { WeeklyUsageData } from "../types/usage-types";
import { getCurrentWeekStart, getPreviousWeekStart } from "../utils/date-formatter";

export const useWeeklyUsage = (): {
  data: WeeklyUsageData | undefined;
  previousWeekData: WeeklyUsageData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageWeeklyCli();

  const weeks = rawData?.weekly ?? [];
  const currentWeek = getCurrentWeekStart();
  const previousWeek = getPreviousWeekStart();

  const data = weeks.find((entry) => entry.week === currentWeek) ?? weeks.at(-1);
  const previousWeekData =
    weeks.find((entry) => entry.week === previousWeek) ?? weeks.filter((e) => e.week < currentWeek).at(-1);

  return { data, previousWeekData, isLoading, error, revalidate };
};
