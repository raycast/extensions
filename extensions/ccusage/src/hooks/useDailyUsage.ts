import { useCCUsageDailyCli } from "./useCCUsageDailyCli";
import { DailyUsageData } from "../types/usage-types";
import { getCurrentLocalDate } from "../utils/date-formatter";

export const useDailyUsage = (): {
  data: DailyUsageData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageDailyCli();

  const data: DailyUsageData | undefined = (() => {
    if (!rawData || !rawData.daily || rawData.daily.length === 0) {
      return undefined;
    }

    const today = getCurrentLocalDate();
    const todayEntry = rawData.daily.find((entry) => entry.date === today);

    if (todayEntry) {
      return todayEntry;
    }

    const latest = rawData.daily[rawData.daily.length - 1];
    return latest;
  })();

  return {
    data,
    isLoading,
    error,
    revalidate,
  };
};
