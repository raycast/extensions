import { useState, useEffect } from "react";
import { App } from "../types";
import { getAllApps, searchApps } from "../utils/appManager";
import { loadRecentApps, addToRecentApps } from "../utils/storage";

interface UseAppsResult {
  apps: App[];
  filteredApps: App[];
  isLoading: boolean;
  error: string | null;
  recentApps: string[];
  searchText: string;
  setSearchText: (text: string) => void;
  trackAppUsage: (appName: string) => Promise<void>;
}

/**
 * Hook for managing app loading, filtering, and recent apps tracking
 */
export function useApps(): UseAppsResult {
  const [apps, setApps] = useState<App[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [recentApps, setRecentApps] = useState<string[]>([]);

  // Load apps and recent data
  useEffect(() => {
    async function loadData() {
      try {
        // Load recent apps first
        const recent = await loadRecentApps();
        setRecentApps(recent);

        // Then load apps with recent data (already sorted by getAllApps)
        const allApps = await getAllApps(recent);
        if (allApps.length === 0) {
          setError("No applications found");
        } else {
          setApps(allApps);
        }
      } catch (err) {
        setError("Failed to get applications: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Track app usage
  async function trackAppUsage(appName: string): Promise<void> {
    const newRecent = await addToRecentApps(appName, recentApps);
    setRecentApps(newRecent);
  }

  // Get filtered apps based on search
  const filteredApps = searchText ? searchApps(apps, searchText, recentApps) : apps;

  return {
    apps,
    filteredApps,
    isLoading,
    error,
    recentApps,
    searchText,
    setSearchText,
    trackAppUsage,
  };
}
