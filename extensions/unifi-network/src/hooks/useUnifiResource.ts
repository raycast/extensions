import { useCallback, useEffect, useState } from "react";
import { UnifiClient } from "../lib/unifi/unifi";

interface UseUnifiResourceOptions<T> {
  unifi: UnifiClient | undefined;
  siteIsLoading: boolean;
  fetchResource: (client: UnifiClient, abortable: AbortController) => Promise<T>;
}

export function useUnifiResource<T>({ unifi, siteIsLoading, fetchResource }: UseUnifiResourceOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((err: unknown) => {
    console.error("Resource Error:", err);
    setError(new Error("Failed to fetch resource"));
    setIsLoading(false);
  }, []);

  const fetchData = useCallback(
    async (abortable: AbortController) => {
      if (!unifi || siteIsLoading) return;
      try {
        const result = await fetchResource(unifi, abortable);
        setData(result);
        setIsLoading(false);
      } catch (err) {
        handleError(err);
      }
    },
    [unifi, siteIsLoading, handleError],
  );

  useEffect(() => {
    const abortable = new AbortController();
    fetchData(abortable);
    return () => abortable.abort();
  }, [fetchData]);

  return { data, isLoading, error, fetchData };
}
