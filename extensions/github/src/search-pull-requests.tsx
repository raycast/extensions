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
    error,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    (searchText, searchFilter, sortTxt) => async (options: { page: number; cursor?: string }) => {
      const result = await github.searchPullRequests({
        numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 25 }),
        query: `is:pr archived:false ${sortTxt} ${searchFilter} ${searchText}`,
        after: options.page > 0 ? options.cursor : undefined,
      });

      return {
        data:
          result.search.edges
            ?.map((edge) => edge?.node as PullRequestFieldsFragment | null | undefined)
            .filter((node): node is PullRequestFieldsFragment => node != null) ?? [],
        hasMore: result.search.pageInfo.hasNextPage,
        cursor: result.search.pageInfo.endCursor ?? undefined,
      };
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
      pagination={pagination}
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
                showAuthor
                {...{ pullRequest, viewer, mutateList, sortQuery, setSortQuery }}
              />
            );
          })}
        </List.Section>
      ) : null}

      <PullRequestListEmptyView error={error} />
    </List>
  );
}

export default withGitHubClient(SearchPullRequests);
