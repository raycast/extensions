import { useCachedPromise } from "@raycast/utils";
import { resolveAllFiles } from "../api";
import { useVisitedFiles } from "./useVisitedFiles";
import { loadStarredFiles } from "../lib/fileStorage";
import { useDesktopApp } from "./useDesktopApp";

/**
 * Custom hook that encapsulates all shared data fetching logic used by both
 * the main command and menu bar components
 */
export function useFigmaData() {
  const {
    data: allFiles,
    isLoading: isLoadingAllFiles,
    error: allFilesError,
    revalidate: revalidateAllFiles,
  } = useCachedPromise(
    async () => {
      const results = await resolveAllFiles();
      return results;
    },
    [],
    {
      keepPreviousData: true,
    },
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
