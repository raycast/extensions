import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import IssueListEmptyView from "./components/IssueListEmptyView";
import IssueListItem from "./components/IssueListItem";
import View from "./components/View";
import { IssueFieldsFragment } from "./generated/graphql";
import { pluralize } from "./helpers";
import { getGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

function SearchIssues() {
  const { github } = getGitHubClient();

  const viewer = useViewer();

  const [searchText, setSearchText] = useState("");

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (searchText) => {
      const result = await github.searchIssues({
        query: `is:issue author:@me archived:false ${searchText}`,
        numberOfItems: 50,
      });

      return result.search.nodes?.map((node) => node as IssueFieldsFragment);
    },
    [searchText],
    { keepPreviousData: true }
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Globally search issues across repositories"
      onSearchTextChange={setSearchText}
      throttle
    >
      {data ? (
        <List.Section
          title={searchText ? "Search Results" : "Created Recently"}
          subtitle={pluralize(data.length, "Issue", { withNumber: true })}
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

export default function Command() {
  return (
    <View>
      <SearchIssues />
    </View>
  );
}
