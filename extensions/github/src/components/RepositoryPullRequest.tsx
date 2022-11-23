import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import { PullRequestFieldsFragment } from "../generated/graphql";
import { getGitHubClient } from "../helpers/withGithubClient";

import PullRequestListItem from "./PullRequestListItem";

export function RepositoryPullRequestList(props: { repo: string }): JSX.Element {
  const { github } = getGitHubClient();
  const [searchText, setSearchText] = useState("");
  const query = searchText;
  const repoFilter = props.repo && props.repo.length > 0 ? `repo:${props.repo}` : "";
  const {
    data,
    isLoading,
    mutate: mutateList,
  } = usePromise(
    async (query) => {
      const result = await github.searchPullRequests({
        query: `is:pr ${repoFilter} archived:false ${query}`,
        numberOfItems: 20,
      });
      return result.search.edges?.map((edge) => edge?.node as PullRequestFieldsFragment);
    },
    [query]
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} navigationTitle={props.repo} throttle>
      <List.Section title="Pull Requests" subtitle={`${data?.length}`}>
        {data?.map((d) => (
          <PullRequestListItem key={d.id} pullRequest={d} mutateList={mutateList} />
        ))}
      </List.Section>
    </List>
  );
}
