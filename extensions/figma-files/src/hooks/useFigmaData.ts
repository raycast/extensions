import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { resolveAllFiles } from "../api";
import type { TeamFiles } from "../types";
import { useVisitedFiles } from "./useVisitedFiles";
import { loadStarredFiles } from "../lib/fileStorage";
import { useDesktopApp } from "./useDesktopApp";

/**
 * Custom hook that encapsulates all shared data fetching logic used by both
 * the main command and menu bar components
 */
export function useFigmaData() {
  // Partial results while a refresh is running, so a slow first load fills in folder by folder
  const [progress, setProgress] = useState<TeamFiles[]>();

  const {
    data: cachedAllFiles,
    isLoading: isLoadingAllFiles,
    error: allFilesError,
    revalidate: revalidateAllFiles,
  } = useCachedPromise(
    async () => {
      setProgress(undefined);
      const results = await resolveAllFiles(setProgress);
      return results;
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  // Data cached by versions before nested folder support has no `folders`; skip it until the refresh finishes
  const allFiles = useMemo(
    () => (isLoadingAllFiles && progress ? progress : cachedAllFiles?.filter((team) => Array.isArray(team.folders))),
    [cachedAllFiles, isLoadingAllFiles, progress],
  );

  const {
    data: starredFiles,
    isLoading: isLoadingStarredFiles,
    error: starredFilesError,
    revalidate: revalidateStarredFiles,
  } = useCachedPromise(async () => {
    const results = await loadStarredFiles();
    return results;
  }, []);

  const {
    files: visitedFiles,
    visitFile,
    isLoading: isLoadingVisitedFiles,
    revalidate: revalidateVisitedFiles,
  } = useVisitedFiles();

  const desktopApp = useDesktopApp();

  // Combined loading state
  const isLoading = isLoadingAllFiles || isLoadingVisitedFiles || isLoadingStarredFiles;

  // Combined error state (prioritize allFilesError as it's the main data source)
  const error = allFilesError || starredFilesError;

  return {
    // Data
    allFiles,
    starredFiles,
    visitedFiles,

    // Loading states
    isLoading,
    isLoadingAllFiles,
    isLoadingStarredFiles,
    isLoadingVisitedFiles,

    // Error states
    error,
    allFilesError,
    starredFilesError,

    // Revalidation functions
    revalidateAllFiles,
    revalidateStarredFiles,
    revalidateVisitedFiles,

    // Actions
    visitFile,

    // App detection
    desktopApp,
  };
}
