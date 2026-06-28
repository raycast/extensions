import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";

/**
 * Hook for fetching and managing Git submodules state.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 *
 * @param gitManager The GitManager instance for the repository.
 * @returns An object with submodule data, loading state, and a revalidation function.
 */
export function useGitSubmodules(gitManager: GitManager): RepositoryContext["submodules"] {
  return useCachedPromise(
    async (_repoPath: string) => {
      const submodules = await gitManager.getSubmodules();
      return submodules;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      initialData: [],
    },
  ) as RepositoryContext["submodules"];
}
