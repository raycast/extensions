import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";
import { BranchesState } from "../types";

/**
 * Hook for fetching and managing Git branches state.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitBranches(gitManager: GitManager): RepositoryContext["branches"] {
  return useCachedPromise(
    async (_repoPath: string) => {
      return await gitManager.getBranches();
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      initialData: {
        currentBranch: undefined,
        detachedHead: undefined,
        localBranches: [],
        remoteBranches: {},
      } as BranchesState,
    },
  ) as RepositoryContext["branches"];
}
