import { useEffect } from "react";
import { useCCUsageBlocksCli } from "./useCCUsageBlocksCli";

export function useBlocksUsage() {
  // Fetch recent blocks (last 3 days) to be more useful in the UI
  const result = useCCUsageBlocksCli({ recent: true });

  useEffect(() => {
    const interval = setInterval(() => {
      result.revalidate();
    }, 60000); // Refresh every minute for blocks

    return () => clearInterval(interval);
  }, [result.revalidate]);

  return {
    data: result.data || null,
    isLoading: result.isLoading,
    error: result.error,
    revalidate: result.revalidate,
  };
}
