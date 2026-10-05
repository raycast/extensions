import { useCachedPromise, useCachedState } from "@raycast/utils";
import { GitManager } from "../utils/git-manager";
import { BranchFilter, RepositoryContext, SelectedBranch } from "../open-repository";
import { Branch, BranchesState, DetachedHead } from "../types";
import { useMemo, useState } from "react";

/**
 * Hook for fetching the commit history of a Git repository.
 * Search is executed by Git (`git log`) rather than client-side filtering.
 * Repository path, branch, and search query are included in cache dependencies.
 */
export function useGitCommits(gitManager: GitManager, branchesState?: BranchesState): RepositoryContext["commits"] {
  const [branchFilter, setBranchFilter] = useCachedState<BranchFilter>(
    `${gitManager.repoPath}:selected-commits-filter`,
    { kind: "current", upstream: false },
  );
  const [searchText, setSearchText] = useState("");

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
            const upstreamName = branchesState.currentBranch.upstream.fullName;
            const upstreamBranch = branchesState.remoteBranches[branchesState.currentBranch.upstream.remote]?.find(
              (branch) => branch.displayName === upstreamName,
            );
            if (!upstreamBranch) return undefined;

            return {
              kind: "branch",
              ...upstreamBranch,
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
          case "local": {
            const localBranch = branchesState.localBranches.find((branch) => branch.name === branchFilter.value.name);
            if (!localBranch) return undefined;

            return {
              kind: "branch",
              ...localBranch,
            } as SelectedBranch;
          }

          case "remote": {
            const remoteName = branchFilter.value.remote;
            if (!remoteName) return undefined;

            const remoteBranches = branchesState.remoteBranches[remoteName];
            if (!remoteBranches) return undefined;

            const remoteBranch = remoteBranches.find((branch) => branch.name === branchFilter.value.name);
            if (!remoteBranch) return undefined;

            return {
              kind: "branch",
              ...remoteBranch,
            } as SelectedBranch;
          }
        }
    }
  }, [branchFilter, branchesState]);

  const commitsPromise = useCachedPromise(
    (
      _repoPath: string,
      branchFilter: BranchFilter,
      searchText: string,
      _selectedBranch?: Branch,
      _detachedHead?: DetachedHead,
    ) =>
      async (options: { page: number }) => {
        const selectedSourceName = evaluateBranchName(branchFilter, branchesState!);

        try {
          const commits = await gitManager.getCommits(selectedSourceName, options.page, searchText);

          return {
            data: commits,
            hasMore: commits.length > 0,
          };
        } catch {
          return { data: [], hasMore: false };
        }
      },
    [gitManager.repoPath, branchFilter, searchText, branchesState?.currentBranch, branchesState?.detachedHead],
    {
      execute: branchesState !== undefined,
      initialData: [],
    },
  );

  return {
    ...commitsPromise,
    selectedBranch,
    filter: branchFilter,
    searchText,
    setFilter: setBranchFilter,
    setSearchText,
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
          return branchesState.currentBranch.upstream?.fullName;
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
