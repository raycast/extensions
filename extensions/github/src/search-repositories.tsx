import { List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";

import RepositoryListEmptyView from "./components/RepositoryListEmptyView";
import RepositoryListItem from "./components/RepositoryListItem";
import SearchRepositoryDropdown from "./components/SearchRepositoryDropdown";
import View from "./components/View";
import { ExtendedRepositoryFieldsFragment } from "./generated/graphql";
import { useHistory } from "./helpers/repository";
import { getGitHubClient } from "./helpers/withGithubClient";

function SearchRepositories() {
  const { github } = getGitHubClient();

  const preferences = getPreferenceValues<Preferences.SearchRepositories>();

  const [searchText, setSearchText] = useState("");
  const [searchFilter, setSearchFilter] = useState<string | null>(null);

  const { data: history, visitRepository } = useHistory(searchText, searchFilter);
  const query = useMemo(
    () =>
      `${searchFilter} ${searchText} fork:${preferences.includeForks} ${
        preferences.includeArchived ? "" : "archived:false"
      }`,
    [searchText, searchFilter]
  );

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (query) => {
      const result = await github.searchRepositories({ query, numberOfItems: 20 });

      return result.search.nodes?.map((node) => node as ExtendedRepositoryFieldsFragment);
    },
    [query],
    { keepPreviousData: true }
  );

  const foundRepositories = useMemo(
    () => data?.filter((repository) => !history.find((r) => r.id === repository.id)),
    [data]
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in public and private repositories"
      onSearchTextChange={setSearchText}
      searchBarAccessory={<SearchRepositoryDropdown onFilterChange={setSearchFilter} />}
      throttle
    >
      <List.Section title="Visited Repositories" subtitle={history ? String(history.length) : undefined}>
        {history.map((repository) => (
          <RepositoryListItem
            key={repository.id}
            repository={repository}
            onVisit={visitRepository}
            mutateList={mutateList}
          />
        ))}
      </List.Section>

      {foundRepositories ? (
        <List.Section
          title={searchText ? "Search Results" : "Found Repositories"}
          subtitle={`${foundRepositories.length}`}
        >
          {foundRepositories.map((repository) => {
            return (
              <RepositoryListItem
                key={repository.id}
                repository={repository}
                mutateList={mutateList}
                onVisit={visitRepository}
              />
            );
          })}
        </List.Section>
      ) : null}

      <RepositoryListEmptyView searchText={searchText} isLoading={isLoading} />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchRepositories />
    </View>
  );
}
