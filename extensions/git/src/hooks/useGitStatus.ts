import { useCachedPromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";
import { StatusState } from "../types";

/**
 * Hook for fetching the file status in a Git repository.
 * Repository path is included in cache dependencies to ensure separate cache per repository.
 */
export function useGitStatus(gitManager: GitManager): RepositoryContext["status"] {
  return useCachedPromise(
    async (_repoPath: string) => {
      const status = await gitManager.getStatus();
      return status;
    },
    [gitManager.repoPath], // Include repository path for separate cache per repository
    {
      initialData: {
        branch: null,
        files: [],
        mode: { kind: "regular" },
      } as StatusState,
    },
  ) as RepositoryContext["status"];
}
