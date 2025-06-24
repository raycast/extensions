import { useCCUsageMonthlyCli } from "./useCCUsageMonthlyCli";
import { MonthlyUsageData } from "../types/usage-types";
import { getCurrentLocalMonth } from "../utils/date-formatter";

export const useMonthlyUsage = (): {
  data: MonthlyUsageData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageMonthlyCli();

  const data: MonthlyUsageData | undefined = (() => {
    if (!rawData || !rawData.monthly || rawData.monthly.length === 0) {
      return undefined;
    }

    const currentMonth = getCurrentLocalMonth();
    const currentMonthEntry = rawData.monthly.find((entry) => entry.month === currentMonth);

    if (currentMonthEntry) {
      return currentMonthEntry;
    }

    const latest = rawData.monthly[rawData.monthly.length - 1];
    return latest;
  })();

  return {
    data,
    isLoading,
    error,
    revalidate,
  };
};
