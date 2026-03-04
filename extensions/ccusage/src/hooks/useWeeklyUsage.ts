import { useEffect } from "react";
import { useCCUsageWeeklyCli } from "./useCCUsageWeeklyCli";

export function useWeeklyUsage() {
  const result = useCCUsageWeeklyCli();

  useEffect(() => {
    const interval = setInterval(() => {
      result.revalidate();
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [result.revalidate]);

  return {
    data: result.data || null,
    isLoading: result.isLoading,
    error: result.error,
    revalidate: result.revalidate,
  };
}
