import { useState, useEffect } from "react";

export function useCommandData<T>(fetchFn: () => Promise<T>, defaultValue: T, refreshInterval?: number) {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await fetchFn();
        setData(result);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();

    if (refreshInterval) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchFn, refreshInterval]);

  return { data, isLoading };
}
