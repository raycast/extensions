import { useMemo } from "react";
import { GitManager } from "../utils/git-manager";
import { resolveTildePath } from "../utils/path-utils";

/**
 * Hook for working with a Git repository.
 * Validates the path synchronously and creates a GitManager to perform operations.
 * Supports tilde (~) paths.
 */
export function useGitRepository(repositoryPath: string): {
  gitManager: GitManager | undefined;
  error: Error | undefined;
} {
  return useMemo(() => {
    try {
      GitManager.validateDirectory(repositoryPath);
      const resolvedPath = resolveTildePath(repositoryPath);
      return {
        gitManager: new GitManager(resolvedPath),
        error: undefined,
      };
    } catch (error) {
      return {
        gitManager: undefined,
        error: new Error(error instanceof Error ? error.message : "Unknown error"),
      };
    }
  }, [repositoryPath]);
}
