import { usePromise } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { RepositoryContext } from "../open-repository";
import { StatusState } from "../types";

/**
 * Hook for fetching the file status in a Git repository.
 */
export function useGitStatus(gitManager: GitManager): RepositoryContext["status"] {
  const {
    data = {
      branch: null,
      files: [],
      mode: { kind: "regular" },
    } as StatusState,
    isLoading,
    error,
    revalidate,
  } = usePromise(
    async (_repoPath: string) => {
      const status = await gitManager.getStatus();
      return status;
    },
    [gitManager.repoPath],
  );

  return { data, isLoading, error, revalidate };
}
