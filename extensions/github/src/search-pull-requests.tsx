import { getPreferenceValues, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { trim } from "lodash";
import { useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import { getBoundedPreferenceNumber } from "./components/Menu";
import PullRequestListEmptyView from "./components/PullRequestListEmptyView";
import PullRequestListItem from "./components/PullRequestListItem";
import SearchRepositoryDropdown from "./components/SearchRepositoryDropdown";
import { PullRequestFieldsFragment } from "./generated/graphql";
import { pluralize } from "./helpers";
import { PR_DEFAULT_SORT_QUERY } from "./helpers/pull-request";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

function SearchPullRequests() {
  const { github } = getGitHubClient();

  const viewer = useViewer();

  const { defaultSearchTerms } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(trim(defaultSearchTerms) + " ");
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", PR_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-search-pr",
  });
  const [searchFilter, setSearchFilter] = useState<string | null>(null);

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (searchText, searchFilter, sortTxt) => {
      const result = await github.searchPullRequests({
        numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 }),
        query: `is:pr archived:false ${sortTxt} ${searchFilter} ${searchText}`,
      });

      return result.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment);
    },
    [searchText, searchFilter, sortQuery],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Globally search pull requests across repositories"
      searchBarAccessory={<SearchRepositoryDropdown onFilterChange={setSearchFilter} />}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {data ? (
        <List.Section
          title={searchText ? "Search Results" : "Created Recently"}
          subtitle={pluralize(data.length, "pull request", { withNumber: true })}
        >
          {data.map((pullRequest) => {
            return (
              <PullRequestListItem
                key={pullRequest.id}
                {...{ pullRequest, viewer, mutateList, sortQuery, setSortQuery }}
              />
            );
          })}
        </List.Section>
      ) : null}

      <PullRequestListEmptyView />
    </List>
  );
}

export default withGitHubClient(SearchPullRequests);
