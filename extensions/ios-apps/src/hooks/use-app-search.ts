import { useCallback, useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { debounce } from "lodash";
import type { AppDetails, IpaToolSearchApp } from "../types";
import { IPATOOL_PATH } from "../utils/paths";
import { ensureAuthenticated } from "../utils/auth";
import { enrichAppDetails } from "../utils/itunes-api";

const execFileAsync = promisify(execFile);

interface UseAppSearchResult {
  apps: AppDetails[];
  isLoading: boolean;
  error: string | null;
  totalResults: number;
  searchText: string;
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

  // Handle enrichment errors
  const handleEnrichmentError = (err: unknown) => {
    process.stderr.write(`App enrichment failed: ${err instanceof Error ? err.message : String(err)}\n`);
    // Continue with unenriched apps rather than failing the whole search
    setApps((prevApps) => [...prevApps]);
  };

  // Handle search errors
  const handleSearchError = (err: unknown) => {
    let errorMessage = "An unknown error occurred";
    if (err instanceof Error) {
      errorMessage = err.message;
      process.stderr.write(`Search error: ${err.message}\n`);
    }
    setError(errorMessage);
    showToast({
      style: Toast.Style.Failure,
      title: "Search Failed",
      message: errorMessage,
    });
  };

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

      // Check if query is empty
      if (!query.trim()) {
        throw new Error("Search query is required");
      }

      // Search for apps using execFile with proper argument passing
      // execFile properly handles argument escaping to prevent command injection
      const { stdout, stderr } = await execFileAsync(
        IPATOOL_PATH,
        [
          "search",
          query.trim(), // Use original query - execFile handles escaping
          "--limit",
          limit.toString(),
          "--format",
          "json",
          "--non-interactive",
        ],
        { shell: false },
      );

      if (stderr) {
        // Log to stderr instead of console
        process.stderr.write(`ipatool search stderr: ${stderr}\n`);
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
        bundleId: app.bundleId || app.bundleID || "", // Handle both bundleId and bundleID formats from ipatool
        version: app.version,
        price: app.price?.toString() || "0",
        currency: "USD", // Default currency for ipatool results
        artistName: app.developer,
        // Required fields from AppDetails interface
        artworkUrl60: "",
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
        averageUserRatingForCurrentVersion: 0,
        userRatingCountForCurrentVersion: 0,
      }));

      // Show progress for enrichment if we have multiple apps
      let enrichmentToast: Toast | null = null;
      if (mappedApps.length > 1) {
        enrichmentToast = await showToast({
          style: Toast.Style.Animated,
          title: "Enriching results",
          message: `Processing ${mappedApps.length} apps...`,
        });
      }

      let completedEnrichments = 0;
      let failedEnrichments = 0;

      // Enrich the app details with iTunes API data and track progress
      const enrichmentPromises = mappedApps.map(async (app) => {
        try {
          const enriched = await enrichAppDetails(app);

          completedEnrichments++;
          if (enrichmentToast) {
            const progressPercent = Math.round((completedEnrichments / mappedApps.length) * 100);
            enrichmentToast.message = `${completedEnrichments}/${mappedApps.length} (${progressPercent}%) enriched`;
          }

          return enriched;
        } catch (err) {
          completedEnrichments++;
          failedEnrichments++;

          if (enrichmentToast) {
            const progressPercent = Math.round((completedEnrichments / mappedApps.length) * 100);
            enrichmentToast.message = `${completedEnrichments}/${mappedApps.length} (${progressPercent}%) - ${failedEnrichments} failed`;
          }

          handleEnrichmentError(err);
          return app;
        }
      });

      const enrichedApps = await Promise.allSettled(enrichmentPromises);
      const finalApps = enrichedApps
        .map((result) => (result.status === "fulfilled" ? result.value : null))
        .filter((app): app is NonNullable<typeof app> => app !== null);

      // Update final enrichment status
      if (enrichmentToast) {
        if (failedEnrichments === 0) {
          enrichmentToast.style = Toast.Style.Success;
          enrichmentToast.title = "Results enriched";
          enrichmentToast.message = `Successfully enriched all ${mappedApps.length} results`;
        } else if (failedEnrichments < mappedApps.length) {
          enrichmentToast.style = Toast.Style.Success;
          enrichmentToast.title = "Results partially enriched";
          enrichmentToast.message = `Enriched ${mappedApps.length - failedEnrichments}/${mappedApps.length} results`;
        } else {
          enrichmentToast.style = Toast.Style.Failure;
          enrichmentToast.title = "Enrichment failed";
          enrichmentToast.message = "Could not enrich any results";
        }
      }

      setApps(finalApps);
      setTotalResults(count);
    } catch (err) {
      handleSearchError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create a debounced version of the search function that doesn't change on re-renders
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      // Wrap in a try/catch to handle errors locally
      try {
        performSearch(query);
      } catch (err) {
        handleSearchError(err);
      }
    }, debounceMs),
    [], // Empty dependency array to ensure stability
  );

  // Update search when text changes
  useEffect(() => {
    if (searchText) {
      debouncedSearch(searchText);
    } else {
      setApps([]);
      setError(null);
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
    searchText,
    setSearchText: (text: string) => setSearchText(text),
  };
}
