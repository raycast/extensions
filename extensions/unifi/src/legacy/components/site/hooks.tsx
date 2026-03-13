import { useState, useEffect } from "react";
import Controller, { Site } from "unifi-client";
import { getAuthenticatedUnifiClient } from "../../lib/unifi";

export function useSites(): {
  error?: Error;
  isLoading: boolean;
  data?: Site[];
} {
  const [data, setData] = useState<Site[]>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [controller, setController] = useState<Controller>();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(undefined);

      try {
        const controller = await getAuthenticatedUnifiClient();

        if (controller) {
          if (controller.auth) {
            setController(controller);

            setIsLoading(false);
          }
        }
      } catch (error) {
        setError(error as Error);
        setIsLoading(false);
      }
    }

    fetchData();

    return () => {
      if (controller) {
        controller.logout();
      }
    };
  }, []);

  useEffect(() => {
    async function fetchSites() {
      try {
        const sites = await controller?.getSites();
        setData(sites);
      } catch (error) {
        setError(error as Error);
      }
    }

    if (controller && !data) {
      fetchSites();
    }
  }, [controller, data]);
  return { error, isLoading, data };
}
