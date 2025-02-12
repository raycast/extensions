import { useState, useEffect } from "react";
import { Site } from "unifi-client";
import { getAuthenticatedUnifiClient } from "../../lib/unifi";

export function useSites(): {
  error?: Error;
  isLoading: boolean;
  data?: Site[];
} {
  const [data, setData] = useState<Site[]>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const controller = await getAuthenticatedUnifiClient();
        const sites = await controller.getSites();
        if (!didUnmount) {
          setData(sites);
        }
      } catch (error) {
        if (!didUnmount) {
          setError(error as Error);
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, []);

  return { error, isLoading, data };
}
