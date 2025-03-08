import { useState, useEffect } from "react";
import { AppDetails } from "../types";
import { enrichAppDetails } from "../utils/itunes-api";

interface UseAppDetailsResult {
  app: AppDetails;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for loading and enriching app details
 * @param initialApp The initial app details to enrich
 * @returns Object with enriched app details and loading state
 */
export function useAppDetails(initialApp: AppDetails): UseAppDetailsResult {
  const [app, setApp] = useState<AppDetails>(initialApp);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEnrichedAppDetails() {
      setIsLoading(true);
      setError(null);

      try {
        const enrichedApp = await enrichAppDetails(initialApp);
        setApp(enrichedApp);
      } catch (error) {
        console.error("Error loading enriched app details:", error);
        setError(`Error: ${error}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadEnrichedAppDetails();
  }, [initialApp.bundleId]);

  return {
    app,
    isLoading,
    error,
  };
}
