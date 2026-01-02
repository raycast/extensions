import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo } from "react";
import { showToast, Toast } from "@raycast/api";
import { fetchRepositoryDefaultBranch } from "../services/repositories";
import { fetchBranchesByPrefix, fetchRepositoryBranches } from "../services/branches";

// Asynchronously load branches for a repository, with support for finding a specific branch by name
export const useBranches = (
  repository: string,
  searchQuery: string,
): { branches: string[]; isLoading: boolean; defaultBranch: string | null } => {
  const isFilteredByPrefix = searchQuery.trim().length > 0;
  const hasRepository = Boolean(repository);

  const {
    data: defaultBranch,
    isLoading: isLoadingDefaultBranch,
    error: defaultBranchError,
  } = useCachedPromise(fetchRepositoryDefaultBranch, [repository], {
    initialData: null,
    keepPreviousData: false,
    execute: hasRepository,
  });

  const {
    data: first100Branches,
    isLoading: isLoadingRepositoryBranches,
    error: allError,
  } = useCachedPromise(fetchRepositoryBranches, [repository], {
    initialData: [],
    keepPreviousData: false,
    execute: hasRepository && !isFilteredByPrefix,
  });

  const {
    data: branchesByPrefix,
    isLoading: isLoadingBranchesByPrefix,
    error: searchError,
  } = useCachedPromise(fetchBranchesByPrefix, [repository, searchQuery.trim()], {
    initialData: [],
    keepPreviousData: true,
    execute: hasRepository && isFilteredByPrefix,
  });

  const first100BranchesWithDefaultBranchFirst = useMemo(() => {
    // If there isn't a default branch, we can just take the first 100 branches
    if (!defaultBranch) return first100Branches;

    // If there is a default branch and it's already at the front of the list, we can use the list
    const defaultBranchIndex = first100Branches.findIndex((branch) => branch === defaultBranch);
    if (defaultBranchIndex === 0) return first100Branches;

    // Remove the default branch from the list, if it's in there
    const sortedBranches = [...first100Branches];
    if (defaultBranchIndex !== -1) sortedBranches.splice(defaultBranchIndex, 1);

    // Make sure that the default branch is at the front of the remaining list, and return it
    sortedBranches.unshift(defaultBranch);
    return sortedBranches;
  }, [first100Branches, defaultBranch]);

  useEffect(() => {
    const error = allError || searchError || defaultBranchError;
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load branches",
        message: error.message,
      });
    }
  }, [allError, searchError, defaultBranchError]);

  if (!hasRepository) {
    return {
      branches: [],
      isLoading: false,
      defaultBranch: null,
    };
  } else if (isLoadingDefaultBranch) {
    return {
      branches: [],
      isLoading: true,
      defaultBranch: null,
    };
  } else if (isFilteredByPrefix) {
    return {
      branches: branchesByPrefix,
      isLoading: isLoadingBranchesByPrefix,
      defaultBranch: defaultBranch || null,
    };
  } else {
    return {
      branches: first100BranchesWithDefaultBranchFirst,
      isLoading: isLoadingRepositoryBranches,
      defaultBranch: defaultBranch || null,
    };
  }
};
