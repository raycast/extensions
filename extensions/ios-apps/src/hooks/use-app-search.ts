import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { debounce } from "lodash";
import { AppDetails } from "../types";
import { IpaToolSearchApp } from "../types";
import { IPATOOL_PATH } from "../utils/paths";
import { ensureAuthenticated } from "../utils/common";
import { enrichAppDetails } from "../utils/itunes-api";

const execAsync = promisify(exec);

interface UseAppSearchResult {
  apps: AppDetails[];
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  setSearchText: (text: string) => void;
}

/**
 * Hook for searching apps with debounced input
 * @param initialSearchText Initial search text
 * @param debounceMs Debounce time in milliseconds
 * @param limit Maximum number of results to return
 * @returns Object with search results and state
 */
export function useAppSearch(initialSearchText = "", debounceMs = 500, limit = 20): UseAppSearchResult {
  const [searchText, setSearchText] = useState(initialSearchText);
  const [isLoading, setIsLoading] = useState(false);
  const [apps, setApps] = useState<AppDetails[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState<number>(0);

  // Define the search function
  const performSearch = async (query: string) => {
    if (!query) {
      setApps([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Ensure the user is authenticated
      await ensureAuthenticated();

      // Search for apps - using the correct flag --format json
      const { stdout, stderr } = await execAsync(
        `${IPATOOL_PATH} search "${query}" --limit ${limit} --format json --non-interactive`,
      );

      if (stderr) {
        console.error("ipatool search stderr:", stderr);
      }

      // Parse the JSON response
      const searchResult = JSON.parse(stdout);

      // Extract the apps array and count from the search result
      // Note: ipatool returns an object with 'apps' array and 'count' field
      const ipaApps: IpaToolSearchApp[] = searchResult.apps || [];
      const count = searchResult.count || 0;

      // Map the ipatool apps to our AppDetails interface
      const mappedApps: AppDetails[] = ipaApps.map((app) => ({
        id: app.id.toString(),
        name: app.name,
        bundleId: app.bundleID.toLowerCase(), // Use lowercase bundleId as per AppDetails interface
        version: app.version,
        price: app.price.toString(),
        artistName: app.developer,
        // Required fields from AppDetails interface
        artworkUrl60: undefined,
        iconUrl: "",
        sellerName: app.developer,
        size: "",
        contentRating: "",
        // Add placeholder values for fields that will be enriched later
        description: "",
        genres: [],
        releaseDate: "",
        currentVersionReleaseDate: "",
        averageUserRating: 0,
        userRatingCount: 0,
        artworkUrl512: "",
        screenshotUrls: [],
        trackViewUrl: "",
        artistViewUrl: "",
        isGameCenterEnabled: false,
      }));

      // Enrich the app details with iTunes API data
      const enrichedApps = await Promise.all(
        mappedApps.map(async (app) => {
          try {
            return await enrichAppDetails(app);
          } catch (error) {
            console.error(`Error enriching app ${app.name}:`, error);
            return app;
          }
        }),
      );

      setApps(enrichedApps);
      setTotalResults(count);
    } catch (error) {
      console.error("Error searching for apps:", error);
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`);
      showToast(Toast.Style.Failure, "Search Failed", String(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Create a debounced version of the search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, debounceMs),
    [],
  );

  // Update search when text changes
  useEffect(() => {
    if (searchText) {
      debouncedSearch(searchText);
    } else {
      setApps([]);
      setTotalResults(0);
    }

    // Cleanup function to cancel any pending debounced calls
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchText, debouncedSearch]);

  return {
    apps,
    isLoading,
    error,
    totalResults,
    setSearchText,
  };
}
