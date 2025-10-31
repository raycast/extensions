import { useCachedPromise, useCachedState } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { BranchFilter, RepositoryContext, SelectedBranch } from "../open-repository";
import { Branch, BranchesState, DetachedHead } from "../types";
import { useMemo } from "react";

/**
 * Hook for fetching the commit history of a Git repository.
 * Repository path and branch are included in cache dependencies to ensure separate cache per repository and branch.
 */
export function useGitCommits(gitManager: GitManager, branchesState?: BranchesState): RepositoryContext["commits"] {
  const [branchFilter, setBranchFilter] = useCachedState<BranchFilter>(
    `${gitManager.repoPath}:selected-commits-filter`,
    { kind: "current", upstream: false },
  );

  const selectedBranch: SelectedBranch | undefined = useMemo(() => {
    if (!branchesState) {
      return undefined;
    }

    switch (branchFilter.kind) {
      case "all":
        return undefined; // undefined means all branches

      case "current":
        if (branchesState.detachedHead) {
          return {
            kind: "detached",
            ...branchesState.detachedHead,
          } as SelectedBranch;
        } else if (branchesState.currentBranch) {
          if (branchFilter.upstream) {
            if (!branchesState.currentBranch.upstream) return undefined;
            const upstreamName = branchesState.currentBranch.upstream!.fullName;
            return {
              kind: "branch",
              ...branchesState.remoteBranches[branchesState.currentBranch.upstream.remote]?.find(
                (branch) => branch.displayName === upstreamName,
              ),
            } as SelectedBranch;
          } else {
            return {
              kind: "branch",
              ...branchesState.currentBranch,
            } as SelectedBranch;
          }
        } else {
          return undefined;
        }

      case "branch":
        switch (branchFilter.value.type) {
          case "current":
          case "local":
            return {
              kind: "branch",
              ...branchesState.localBranches.find((branch) => branch.name === branchFilter.value.name),
            } as SelectedBranch;

          case "remote":
            if (!branchesState.remoteBranches[branchFilter.value.remote!]) {
              return undefined;
            }

            return {
              kind: "branch",
              ...branchesState.remoteBranches[branchFilter.value.remote!].find(
                (branch) => branch.name === branchFilter.value.name,
              ),
            } as SelectedBranch;
        }
    }
  }, [branchFilter, branchesState]);

  const commitsPromise = useCachedPromise(
    (_repoPath: string, branchFilter: BranchFilter, _selectedBranch?: Branch, _detachedHead?: DetachedHead) =>
      async (options: { page: number }) => {
        const selectedSourceName = evaluateBranchName(branchFilter, branchesState!);
        const commits = await gitManager.getCommits(selectedSourceName, options.page);

        return {
          data: commits,
          hasMore: commits.length > 0,
        };
      },
    [gitManager.repoPath, branchFilter, branchesState?.currentBranch, branchesState?.detachedHead], // Include both repository path and branch for proper cache isolation
    {
      execute: branchesState !== undefined,
      initialData: [],
    },
  );

  return {
    ...commitsPromise,
    selectedBranch,
    filter: branchFilter,
    setFilter: setBranchFilter,
  } as RepositoryContext["commits"];
}

function evaluateBranchName(branchFilter: BranchFilter, branchesState: BranchesState): string | undefined {
  switch (branchFilter.kind) {
    case "all":
      return undefined; // undefined means all branches

    case "current":
      if (branchesState.detachedHead) {
        return branchesState.detachedHead.commitHash;
      } else if (branchesState.currentBranch) {
        if (branchFilter.upstream) {
          return branchesState.currentBranch.upstream!.fullName;
        } else {
          return branchesState.currentBranch.name;
        }
      } else {
        console.warn("No current branch found");
        return undefined;
      }

    case "branch":
      switch (branchFilter.value.type) {
        case "current":
        case "local":
          return branchFilter.value.name;

        case "remote":
          return `${branchFilter.value.remote}/${branchFilter.value.name}`;
      }
  }
}
