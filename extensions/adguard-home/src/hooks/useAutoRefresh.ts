import { useState, useEffect } from "react";

export function useAutoRefresh(fetchFunction: () => Promise<void>, interval: number) {
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);

  useEffect(() => {
    if (!isAutoRefreshEnabled) return undefined;

    const timer = setInterval(fetchFunction, interval);
    return () => clearInterval(timer);
  }, [isAutoRefreshEnabled, fetchFunction, interval]);

  return {
    isAutoRefreshEnabled,
    toggleAutoRefresh: () => setIsAutoRefreshEnabled((prev) => !prev),
  };
}
