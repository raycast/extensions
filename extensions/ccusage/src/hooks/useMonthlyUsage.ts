import { useCCUsageMonthlyCli } from "./useCCUsageMonthlyCli";
import { MonthlyUsageData } from "../types/usage-types";
import { getCurrentLocalMonth } from "../utils/date-formatter";

export const useMonthlyUsage = (): {
  data: MonthlyUsageData | undefined;
  previousMonthData: MonthlyUsageData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageMonthlyCli();
  const months = rawData?.monthly ?? [];
  const data = months.find((entry) => entry.month === getCurrentLocalMonth());
  const previousMonthData = data ? months.filter((entry) => entry.month < data.month).at(-1) : undefined;
  return { data, previousMonthData, isLoading, error, revalidate };
};
