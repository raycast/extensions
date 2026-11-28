import { format, subMonths } from "date-fns";
import { useCCUsageMonthlyCli } from "./useCCUsageMonthlyCli";
import { MonthlyUsageData } from "../types/usage-types";

export const useMonthlyUsage = (): {
  data: MonthlyUsageData | undefined;
  previousMonthData: MonthlyUsageData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
} => {
  const { data: rawData, isLoading, error, revalidate } = useCCUsageMonthlyCli();
  const months = rawData?.monthly ?? [];
  const now = new Date();
  const data = months.find((entry) => entry.month === format(now, "yyyy-MM"));
  const previousMonth = format(subMonths(now, 1), "yyyy-MM");
  const previousMonthData = data ? months.find((entry) => entry.month === previousMonth) : undefined;
  return { data, previousMonthData, isLoading, error, revalidate };
};
