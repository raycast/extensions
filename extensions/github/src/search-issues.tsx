import { getPreferenceValues, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { trim } from "lodash";
import { useState } from "react";

import { getGitHubClient } from "./api/githubClient";
import IssueListEmptyView from "./components/IssueListEmptyView";
import IssueListItem from "./components/IssueListItem";
import { getBoundedPreferenceNumber } from "./components/Menu";
import SearchRepositoryDropdown from "./components/SearchRepositoryDropdown";
import { IssueFieldsFragment } from "./generated/graphql";
import { pluralize } from "./helpers";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

function SearchIssues() {
  const { github } = getGitHubClient();

  const viewer = useViewer();

  const { defaultSearchTerms } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(trim(defaultSearchTerms) + " ");
  const [searchFilter, setSearchFilter] = useState<string | null>(null);

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (searchText, searchFilter) => {
      const result = await github.searchIssues({
        numberOfItems: getBoundedPreferenceNumber({ name: "numberOfResults", default: 50 }),
        query: `is:issue archived:false ${searchFilter} ${searchText}`,
      });

      return result.search.nodes?.map((node) => node as IssueFieldsFragment);
    },
    [searchText, searchFilter],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Globally search issues across repositories"
      searchBarAccessory={<SearchRepositoryDropdown onFilterChange={setSearchFilter} />}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {data ? (
        <List.Section
          title={searchText ? "Search Results" : "Created Recently"}
          subtitle={pluralize(data.length, "issue", { withNumber: true })}
        >
          {data.map((issue) => {
            return <IssueListItem key={issue.id} issue={issue} viewer={viewer} mutateList={mutateList} />;
          })}
        </List.Section>
      ) : null}

      <IssueListEmptyView />
    </List>
  );
}

export default withGitHubClient(SearchIssues);
