import { useCCUsageDailyCli } from "./useCCUsageDailyCli";
import { DailyUsageData } from "../types/usage-types";
import { getCurrentLocalDate } from "../utils/date-formatter";

export const useDailyUsage = (): {
  data: DailyUsageData | undefined;
  previousDayData: DailyUsageData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageDailyCli();

  const days = rawData?.daily ?? [];
  const today = getCurrentLocalDate();
  const data: DailyUsageData | undefined = days.find((entry) => entry.date === today);
  const previousDayData = data ? days.filter((entry) => entry.date < today).at(-1) : undefined;

  return {
    data,
    previousDayData,
    isLoading,
    error,
    revalidate,
  };
};
