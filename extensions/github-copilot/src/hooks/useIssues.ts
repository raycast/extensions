import { useCachedPromise } from "@raycast/utils";
import { fetchOpenIssues, searchIssues, Issue } from "../services/issues";

export function useIssues(repository: string, searchQuery?: string) {
  const hasRepository = Boolean(repository);
  const isSearching = Boolean(searchQuery?.trim());

  const { data: openIssuesData, isLoading: isLoadingOpenIssues } = useCachedPromise(fetchOpenIssues, [repository], {
    execute: hasRepository && !isSearching,
    keepPreviousData: true,
  });

  const { data: searchResults, isLoading: isLoadingSearch } = useCachedPromise(
    searchIssues,
    [repository, searchQuery?.trim() || ""],
    {
      execute: hasRepository && isSearching,
      keepPreviousData: true,
    },
  );

  if (!hasRepository) {
    return {
      data: { issues: [] as Issue[], repositoryId: "", copilotBotId: null },
      isLoading: false,
    };
  }

  if (isSearching) {
    return {
      data: {
        issues: searchResults || [],
        repositoryId: openIssuesData?.repositoryId || "",
        copilotBotId: openIssuesData?.copilotBotId || null,
      },
      isLoading: isLoadingSearch || isLoadingOpenIssues,
    };
  }

  return {
    data: openIssuesData,
    isLoading: isLoadingOpenIssues,
  };
}
