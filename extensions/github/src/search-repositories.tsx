import { List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getBoundedPreferenceNumber } from "./components/Menu";
import RepositoryListEmptyView from "./components/RepositoryListEmptyView";
import RepositoryListItem from "./components/RepositoryListItem";
import SearchRepositoryDropdown from "./components/SearchRepositoryDropdown";
import { ExtendedRepositoryFieldsFragment } from "./generated/graphql";
import { REPO_DEFAULT_SORT_QUERY, REPO_SORT_TYPES_TO_QUERIES, useHistory } from "./helpers/repository";
import { withGitHubClient } from "./helpers/withGithubClient";

function SearchRepositories() {
  const { github } = getGitHubClient();

  const preferences = getPreferenceValues<Preferences.SearchRepositories>();

  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<string | null>(null);
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", REPO_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-search-repo",
  });
  const sortTypesData = REPO_SORT_TYPES_TO_QUERIES;

  const { data: history, visitRepository, updateRepository, removeRepository } = useHistory(searchText, searchFilter);
  const query = useMemo(
    () =>
      `${searchFilter} ${searchText} ${sortQuery} fork:${preferences.includeForks} ${
        preferences.includeArchived ? "" : "archived:false"
      }`.toLowerCase(),
    [searchText, searchFilter, sortQuery, preferences.includeForks, preferences.includeArchived],
  );

  const {
    data,
    isLoading,
    error,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    (query: string | null) => async (options: { page: number; cursor?: string }) => {
      if (!query) return { data: [] as ExtendedRepositoryFieldsFragment[], hasMore: false };

      const result = await github.searchRepositories({
        query,
        numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 25 }),
        after: options.page > 0 ? options.cursor : undefined,
      });
      return {
        data: result.search.nodes?.map((node) => node as ExtendedRepositoryFieldsFragment) ?? [],
        hasMore: result.search.pageInfo.hasNextPage,
        cursor: result.search.pageInfo.endCursor ?? undefined,
      };
    },
    [searchText.trim() || searchFilter?.trim() ? query : null],
    { keepPreviousData: false },
  );

  useEffect(
    () => history.forEach((repository) => data?.find((r) => r.id === repository.id && visitRepository(r))),
    [data],
  );

  const validHistory = useMemo(
    () => history.filter((repository) => data?.find((r) => r.id === repository.id)),
    [data, history],
  );

  const foundRepositories = useMemo(
    () => data?.filter((repository) => !validHistory.find((r) => r.id === repository.id)),
    [data, validHistory],
  );

  const visitedRepositories = searchText.trim() && data && data.length > 0 ? validHistory : history;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in public and private repositories"
      onSearchTextChange={setSearchText}
      searchBarAccessory={<SearchRepositoryDropdown onFilterChange={setSearchFilter} />}
      throttle={!preferences.disableThrottle}
      pagination={pagination}
    >
      {visitedRepositories.length > 0 ? (
        <List.Section
          title={searchText.trim() ? "Visited Repositories" : "Recent Visited Repositories"}
          subtitle={String(visitedRepositories.length)}
        >
          {visitedRepositories.map((repository) => (
            <RepositoryListItem
              key={repository.id}
              repository={repository}
              onVisit={visitRepository}
              onUpdate={updateRepository}
              onRemove={removeRepository}
              mutateList={mutateList}
              sortQuery={sortQuery}
              setSortQuery={setSortQuery}
              sortTypesData={sortTypesData}
            />
          ))}
        </List.Section>
      ) : null}

      {foundRepositories ? (
        <List.Section
          title={searchText ? "Search Results" : "Found Repositories"}
          subtitle={`${foundRepositories.length}`}
        >
          {foundRepositories.map((repository) => (
            <RepositoryListItem
              key={repository.id}
              repository={repository}
              onVisit={visitRepository}
              onUpdate={updateRepository}
              mutateList={mutateList}
              sortQuery={sortQuery}
              setSortQuery={setSortQuery}
              sortTypesData={sortTypesData}
            />
          ))}
        </List.Section>
      ) : null}

      <RepositoryListEmptyView searchText={searchText} isLoading={isLoading} error={error} />
    </List>
  );
}

export default withGitHubClient(SearchRepositories);
