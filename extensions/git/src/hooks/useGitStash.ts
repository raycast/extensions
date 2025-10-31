import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";

/**
 * Hook for fetching the list of stashes in a repository.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 *
 * @param gitManager The GitManager instance for the repository.
 * @returns An object with stash data, loading state, and a revalidation function.
 */
export function useGitStash(gitManager: GitManager): RepositoryContext["stashes"] {
  return useCachedPromise(
    async (_repoPath: string) => {
      const stashes = await gitManager.getStashes();
      return stashes;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      initialData: [],
    },
  ) as RepositoryContext["stashes"];
}
