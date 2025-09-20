import { useCCUsageTotalCli } from "./useCCUsageTotalCli";
import { TotalUsageData } from "../types/usage-types";

export const useTotalUsage = (): {
  data: TotalUsageData | undefined;
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

  return {
    data,
    isLoading,
    error,
    revalidate,
  };
};
