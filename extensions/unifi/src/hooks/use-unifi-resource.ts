import { useCallback, useEffect, useRef, useState } from "react";
import { UnifiClient } from "../lib/unifi/unifi";

interface UnifiResourceProps<T> {
  unifi: UnifiClient | undefined;
  fetchResource: (client: UnifiClient, abortable: AbortController) => Promise<T>;
  autoLoad?: boolean;
  requireSite?: boolean;
}

export default function useUnifiResource<T>({
  unifi,
  fetchResource,
  autoLoad = true,
  requireSite = true,
}: UnifiResourceProps<T>) {
  const [data, setData] = useState<T>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error>();
  const isMounted = useRef(false);
  const abortController = useRef<AbortController | undefined>(undefined);
  const unmounting = useRef(false);

  const cleanup = useCallback(() => {
    unmounting.current = true;
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = undefined;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!unifi || unmounting.current) return;
    if (requireSite && !unifi.isSiteSet()) return;

    // Cancel any in-flight requests
    if (abortController.current) {
      abortController.current.abort();
    }

    // Don't start new requests if unmounting
    if (unmounting.current) return;

    abortController.current = new AbortController();
    setIsLoading(true);
    setError(undefined);

    try {
      const result = await fetchResource(unifi, abortController.current);
      if (isMounted.current && !unmounting.current) {
        setData(result);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Error fetching resource:", err);
      if (isMounted.current && !unmounting.current) {
        setError(err as Error);
      }
    } finally {
      if (isMounted.current && !unmounting.current) {
        setIsLoading(false);
      }
    }
  }, [unifi, fetchResource, requireSite]);

  // Set mounted flag and handle cleanup
  useEffect(() => {
    isMounted.current = true;
    unmounting.current = false;

    return () => {
      cleanup();
      isMounted.current = false;
    };
  }, [cleanup]);

  // Initial load and reload when dependencies change
  useEffect(() => {
    if (!autoLoad || unmounting.current) return;

    console.log("Fetching resource", {
      hasUnifi: !!unifi,
      requireSite,
      hasSite: unifi?.isSiteSet(),
    });

    fetchData();
  }, [autoLoad, unifi, fetchResource, requireSite]);

  return {
    data,
    isLoading,
    error,
    fetchData,
  };
}
