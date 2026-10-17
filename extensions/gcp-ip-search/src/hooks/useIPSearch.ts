import { useState, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  SearchResult,
  checkGcloudInstalled,
  getGCPProjects,
  searchIPInProject,
} from "../utils";
import { SearchMode } from "../types";

interface UseIPSearchParams {
  ip: string;
  mode: SearchMode;
  customProjectIds?: string[];
  initialResults?: SearchResult[];
  onSaveToHistory: (
    ip: string,
    results: SearchResult[],
    mode: SearchMode,
  ) => Promise<void>;
  onRemoveFromHistory: (ip: string) => Promise<void>;
}

export function useIPSearch({
  ip,
  mode,
  customProjectIds,
  initialResults,
  onSaveToHistory,
  onRemoveFromHistory,
}: UseIPSearchParams) {
  const [results, setResults] = useState<SearchResult[]>(initialResults || []);
  const [isLoading, setIsLoading] = useState(!initialResults);
  const [scanProgress, setScanProgress] = useState({
    current: 0,
    total: 0,
    currentProjectName: "",
    currentProjectId: "",
  });

  useEffect(() => {
    if (initialResults) return;

    let isMounted = true;

    (async () => {
      try {
        // Check gcloud
        const gcloudInstalled = await checkGcloudInstalled();
        if (!gcloudInstalled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Gcloud CLI Not Found",
            message: "The Google Cloud SDK is required to use this extension.",
          });
          if (isMounted) setIsLoading(false);
          return;
        }

        let projects = await getGCPProjects();

        // Filter projects for custom mode
        if (mode === "custom" && customProjectIds) {
          const allowedIds = new Set(customProjectIds);
          projects = projects.filter((p) => allowedIds.has(p.id));
        }

        if (isMounted) {
          setScanProgress({
            current: 0,
            total: projects.length,
            currentProjectName: "",
            currentProjectId: "",
          });
        }

        if (projects.length === 0) {
          if (isMounted) setIsLoading(false);

          if (mode !== "custom") {
            await onRemoveFromHistory(ip);
          }

          await showToast({
            style: Toast.Style.Failure,
            title: "No Accessible Projects Found",
            message:
              mode === "custom"
                ? "Check your custom project list"
                : "Check your gcloud auth",
          });
          return;
        }

        let processedCount = 0;
        const searchResults: SearchResult[] = [];
        const CONCURRENCY = 10;

        for (let i = 0; i < projects.length; i += CONCURRENCY) {
          if (!isMounted) break;

          if (mode === "quick" && searchResults.length > 0) {
            break;
          }

          const batch = projects.slice(i, i + CONCURRENCY);

          const batchResults = await Promise.all(
            batch.map(async (project) => {
              try {
                return await searchIPInProject(project.id, project.name, ip);
              } catch {
                return [];
              } finally {
                processedCount++;
                if (isMounted) {
                  setScanProgress((prev) => ({
                    ...prev,
                    current: processedCount,
                    currentProjectName: project.name,
                    currentProjectId: project.id,
                  }));
                }
              }
            }),
          );

          const newResults = batchResults.flat();
          if (newResults.length > 0) {
            searchResults.push(...newResults);
          }
        }

        if (!isMounted) return;

        setScanProgress((prev) => ({ ...prev, current: projects.length }));
        setResults(searchResults);

        if (searchResults.length > 0) {
          await onSaveToHistory(ip, searchResults, mode);
        } else {
          await onRemoveFromHistory(ip);

          await showToast({
            style: Toast.Style.Failure,
            title: "No Resources Found",
            message: `IP ${ip} was not found. Removed from history.`,
          });
        }
      } catch (error) {
        if (!isMounted) return;
        await showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message: String(error),
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    ip,
    mode,
    initialResults,
    customProjectIds,
    onSaveToHistory,
    onRemoveFromHistory,
  ]);

  return {
    results,
    isLoading,
    scanProgress,
  };
}
