import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { IssueFieldsFragment } from "../generated/graphql";
import { getGitHubClient } from "../helpers/withGithubClient";

import IssueListItem from "./IssueListItem";

export function RepositoryIssueList(props: { repo: string }): JSX.Element {
  const { github } = getGitHubClient();
  const [searchText, setSearchText] = useState("");
  const query = searchText;
  const repoFilter = props.repo && props.repo.length > 0 ? `repo:${props.repo}` : "";
  const {
    data,
    isLoading,
    mutate: mutateList,
  } = useCachedPromise(
    async (query) => {
      const result = github.searchIssues({
        query: `is:issue ${repoFilter} ${query}`,
        numberOfItems: 20,
        avatarSize: 64,
      });
      return (await result).search.nodes?.map((node) => node as IssueFieldsFragment);
    },
    [query],
    { keepPreviousData: true }
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} navigationTitle={props.repo} throttle>
      <List.Section title="Issues" subtitle={`${data?.length}`}>
        {data?.map((d) => (
          <IssueListItem key={d.id} issue={d} mutateList={mutateList} />
        ))}
      </List.Section>
    </List>
  );
}
