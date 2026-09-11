import { useCachedState, usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { basename } from "path";
import { search, sortKind } from "fast-fuzzy";
import { GitManager } from "../utils/git-manager";

const MAX_RESULTS = 60;

/**
 * Hook for searching tracked files in a Git repository with fuzzy match.
 * Exposes recent files list (persisted per repository), search results, loading state, and clear history.
 * Fetches file list only when needed (non-empty query or non-empty recent files) via execute flag.
 */
export function useTrackedFilesSearch(gitManager: GitManager, query: string) {
  const [recentFiles, setRecentFiles] = useCachedState<string[]>(`recent-files-${gitManager.repoPath}`, []);

  const { data: filePaths = [], isLoading } = usePromise(
    async (_repoPath: string) => gitManager.getTrackedFilePaths(),
    [gitManager.repoPath],
  );

  const searchResult = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [] as string[];

    return search(trimmed, filePaths, {
      keySelector: (filePath) => basename(filePath),
      sortBy: sortKind.bestMatch,
      useDamerau: true,
      ignoreCase: true,
    }).slice(0, MAX_RESULTS);
  }, [filePaths, query]);

  const addRecent = (filePath: string) => {
    setRecentFiles((prev) => [filePath, ...prev.filter((p) => p !== filePath)]);
  };

  const clearHistory = () => {
    setRecentFiles([]);
  };

  return {
    recentFiles,
    searchResult,
    isLoading,
    clearHistory,
    addRecent,
    filePaths,
  };
}
