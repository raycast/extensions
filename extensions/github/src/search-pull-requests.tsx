import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import PullRequestListEmptyView from "./components/PullRequestListEmptyView";
import PullRequestListItem from "./components/PullRequestListItem";
import View from "./components/View";
import { PullRequestFieldsFragment } from "./generated/graphql";
import { pluralize } from "./helpers";
import { getGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

function SearchPullRequests() {
  const { github } = getGitHubClient();

  const viewer = useViewer();

  const [searchText, setSearchText] = useState("");

  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (searchText) => {
      const result = await github.searchPullRequests({
        query: `is:pr author:@me archived:false ${searchText}`,
        numberOfItems: 50,
      });

      return result.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment);
    },
    [searchText],
    { keepPreviousData: true }
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Globally search pull requests across repositories"
      onSearchTextChange={setSearchText}
      throttle
    >
      {data ? (
        <List.Section
          title={searchText ? "Search Results" : "Created Recently"}
          subtitle={pluralize(data.length, "Pull Request", { withNumber: true })}
        >
          {data.map((pullRequest) => {
            return (
              <PullRequestListItem
                key={pullRequest.id}
                pullRequest={pullRequest}
                viewer={viewer}
                mutateList={mutateList}
              />
            );
          })}
        </List.Section>
      ) : null}

      <PullRequestListEmptyView />
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <SearchPullRequests />
    </View>
  );
}
