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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadEnrichedAppDetails() {
      // Skip if we don't have the minimum required data
      if (!initialApp.bundleId) {
        return; // Loading state already correctly initialized
      }

      if (!isMounted) return;

      setIsLoading(true);
      setError(null);

      try {
        const enrichedApp = await enrichAppDetails(initialApp);
        if (isMounted) {
          setApp(enrichedApp);
        }
      } catch (error) {
        console.error("Error loading enriched app details:", error);
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          setError(`Error: ${errorMessage}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEnrichedAppDetails();

    return () => {
      isMounted = false;
    };
  }, [
    initialApp.bundleId,
    initialApp.id,
    initialApp.name,
    initialApp.version,
    initialApp.artistName,
    initialApp.artworkUrl60,
    initialApp.artworkUrl512,
  ]);

  return {
    app,
    isLoading,
    error,
  };
}
