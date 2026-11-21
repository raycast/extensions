import { format, subDays } from "date-fns";
import { useCCUsageWeeklyCli } from "./useCCUsageWeeklyCli";
import { WeeklyUsageData } from "../types/usage-types";

export const useWeeklyUsage = (): {
  data: WeeklyUsageData | undefined;
  previousWeekData: WeeklyUsageData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageWeeklyCli();

  const weeks = rawData?.weekly ?? [];
  // ccusage picks the first day of its weeks, so match by range rather than one start date.
  const weekAgo = format(subDays(new Date(), 7), "yyyy-MM-dd");
  const data = weeks.find((entry) => entry.week > weekAgo);
  const previousWeekData = data ? weeks.filter((entry) => entry.week < data.week).at(-1) : undefined;

  return { data, previousWeekData, isLoading, error, revalidate };
};
