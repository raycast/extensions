import { getPreferenceValues, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { trim } from "lodash";
import { useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import IssueListEmptyView from "./components/IssueListEmptyView";
import IssueListItem from "./components/IssueListItem";
import { getSearchPageSize } from "./components/Menu";
import SearchRepositoryDropdown from "./components/SearchRepositoryDropdown";
import { IssueFieldsFragment } from "./generated/graphql";
import { compactFragmentNodes, pluralize, uniqueById } from "./helpers";
import { ISSUE_DEFAULT_SORT_QUERY, normalizeIssueSearchText, parseIssueNumberLookup } from "./helpers/issue";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

function SearchIssues() {
  const { github } = getGitHubClient();

  const viewer = useViewer();

  const { defaultSearchTerms } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(trim(defaultSearchTerms) + " ");
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", ISSUE_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-search-issue",
  });
  const [searchFilter, setSearchFilter] = useState<string | null>(null);

  const {
    data,
    isLoading,
    mutate: mutateList,
    pagination,
  } = useCachedPromise(
    (searchText, searchFilter, sortTxt) =>
      async ({ cursor }) => {
        if (!cursor) {
          const lookup = parseIssueNumberLookup(`${searchFilter ?? ""} ${searchText}`);
          if (lookup) {
            try {
              const exact = await github.issueByNumber(lookup);
              if (exact.repository?.issue) {
                return {
                  data: [exact.repository.issue as IssueFieldsFragment],
                  hasMore: false,
                };
              }
            } catch {
              // Fall back to paginated search when the repository is inaccessible.
            }
          }
        }

        const result = await github.searchIssues({
          numberOfItems: getSearchPageSize(),
          query: `is:issue archived:false ${sortTxt} ${searchFilter ?? ""} ${normalizeIssueSearchText(searchText)}`,
          after: cursor,
        });

        return {
          data: compactFragmentNodes<IssueFieldsFragment>(result.search.nodes),
          hasMore: result.search.pageInfo.hasNextPage,
          cursor: result.search.pageInfo.endCursor ?? undefined,
        };
      },
    [searchText, searchFilter, sortQuery],
    { keepPreviousData: true },
  );

  const issues = uniqueById(data ?? []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search issues, or owner/repo#123"
      searchBarAccessory={<SearchRepositoryDropdown onFilterChange={setSearchFilter} />}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
      pagination={pagination}
    >
      {data ? (
        <List.Section
          title={searchText ? "Search Results" : "Created Recently"}
          subtitle={pluralize(issues.length, "issue", { withNumber: true })}
        >
          {issues.map((issue) => {
            return <IssueListItem key={issue.id} {...{ issue, viewer, mutateList, sortQuery, setSortQuery }} />;
          })}
        </List.Section>
      ) : null}

      <IssueListEmptyView />
    </List>
  );
}

export default withGitHubClient(SearchIssues);
