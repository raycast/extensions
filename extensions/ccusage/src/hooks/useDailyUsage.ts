import { subDays, format } from "date-fns";
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

  const previousDayData: DailyUsageData | undefined = (() => {
    if (!rawData || !rawData.daily || rawData.daily.length === 0) {
      return undefined;
    }

    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const yesterdayEntry = rawData.daily.find((entry) => entry.date === yesterday);

    if (yesterdayEntry) {
      return yesterdayEntry;
    }

    const today = getCurrentLocalDate();
    const priorEntries = rawData.daily.filter((entry) => entry.date < today);
    return priorEntries.length > 0 ? priorEntries[priorEntries.length - 1] : undefined;
  })();

  return {
    data,
    previousDayData,
    isLoading,
    error,
    revalidate,
  };
};
