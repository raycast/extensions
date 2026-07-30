import { useCachedPromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";
import { Worktree } from "../types";
import { realPath } from "../utils/path-utils";

/**
 * Hook for fetching and managing Git worktrees state.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 *
 * @param gitManager The GitManager instance for the repository.
 * @returns An object with worktree data, loading state, a revalidation function and worktree lookups.
 */
export function useGitWorktrees(gitManager: GitManager): RepositoryContext["worktrees"] {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (_repoPath: string) => {
      const worktrees = await gitManager.getWorktrees();
      return worktrees;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      initialData: [],
    },
  );

  // Git reports resolved paths, so the opened path has to be resolved for comparison as well
  const openedPath = useMemo(() => realPath(gitManager.repoPath), [gitManager.repoPath]);

  const isOpened = useCallback((worktree: Worktree) => realPath(worktree.path) === openedPath, [openedPath]);

  const attachedTo = useCallback(
    (branchName: string): Worktree | undefined =>
      data.find((worktree) => worktree.branch === branchName && !isOpened(worktree)),
    [data, isOpened],
  );

  return { data, isLoading, error, revalidate, isOpened, attachedTo };
}
