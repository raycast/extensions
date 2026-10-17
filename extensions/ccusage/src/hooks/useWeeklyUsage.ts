import { useCCUsageWeeklyCli } from "./useCCUsageWeeklyCli";
import { WeeklyUsageData } from "../types/usage-types";
import { getCurrentWeekStart } from "../utils/date-formatter";

export const useWeeklyUsage = (): {
  data: WeeklyUsageData | undefined;
  previousWeekData: WeeklyUsageData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageWeeklyCli();

  const weeks = rawData?.weekly ?? [];
  const data = weeks.find((entry) => entry.week === getCurrentWeekStart()) ?? weeks.at(-1);
  const previousWeekData = data ? weeks.filter((entry) => entry.week < data.week).at(-1) : undefined;

  return { data, previousWeekData, isLoading, error, revalidate };
};
