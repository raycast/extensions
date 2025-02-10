import { List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";

import { getGitHubClient } from "../api/githubClient";
import { PullRequestFieldsFragment } from "../generated/graphql";
import { PR_DEFAULT_SORT_QUERY } from "../helpers/pull-request";

import PullRequestListItem from "./PullRequestListItem";

export function RepositoryPullRequestList(props: { repo: string }): JSX.Element {
  const { github } = getGitHubClient();
  const [searchText, setSearchText] = useState("");
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", PR_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-repo-pr",
  });
  const query = searchText;
  const repoFilter = props.repo && props.repo.length > 0 ? `repo:${props.repo}` : "";
  const {
    data,
    isLoading,
    mutate: mutateList,
  } = usePromise(
    async (query, sortTxt) => {
      const result = await github.searchPullRequests({
        query: `is:pr ${repoFilter} ${sortTxt} archived:false ${query}`,
        numberOfItems: 20,
      });
      return result.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment);
    },
    [query, sortQuery],
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} navigationTitle={props.repo} throttle>
      <List.Section title="Pull Requests" subtitle={`${data?.length}`}>
        {data?.map((d) => (
          <PullRequestListItem key={d.id} pullRequest={d} {...{ mutateList, sortQuery, setSortQuery }} />
        ))}
      </List.Section>
    </List>
  );
}
