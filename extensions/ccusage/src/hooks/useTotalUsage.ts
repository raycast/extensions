import { useCCUsageTotalCli } from "./useCCUsageTotalCli";
import { TotalUsageData } from "../types/usage-types";
import { getCurrentLocalMonth } from "../utils/date-formatter";

export const useTotalUsage = (): {
  data: TotalUsageData | undefined;
  monthlyCost: number;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageTotalCli();

  const data: TotalUsageData | undefined = rawData?.totals
    ? {
        inputTokens: rawData.totals.inputTokens,
        outputTokens: rawData.totals.outputTokens,
        cacheCreationTokens: rawData.totals.cacheCreationTokens,
        cacheReadTokens: rawData.totals.cacheReadTokens,
        totalTokens: rawData.totals.totalTokens,
        totalCost: rawData.totals.totalCost,
      }
    : undefined;

  const currentMonth = getCurrentLocalMonth();
  const monthlyCost =
    rawData?.daily?.filter((day) => day.date.startsWith(currentMonth)).reduce((sum, day) => sum + day.totalCost, 0) ??
    0;

  return {
    data,
    monthlyCost,
    isLoading,
    error,
    revalidate,
  };
};
