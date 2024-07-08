import { List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";

import { getGitHubClient } from "../api/githubClient";
import { IssueFieldsFragment } from "../generated/graphql";
import { ISSUE_DEFAULT_SORT_QUERY } from "../helpers/issue";

import IssueListItem from "./IssueListItem";

export function RepositoryIssueList(props: { repo: string }): JSX.Element {
  const { github } = getGitHubClient();
  const [searchText, setSearchText] = useState("");
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", ISSUE_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-repo-issue",
  });
  const repoFilter = props.repo && props.repo.length > 0 ? `repo:${props.repo}` : "";
  const {
    data,
    isLoading,
    mutate: mutateList,
  } = usePromise(
    async (searchText, sortTxt) => {
      const result = await github.searchIssues({
        query: `is:issue ${sortTxt} ${repoFilter} ${searchText}`,
        numberOfItems: 20,
      });
      return result.search.nodes?.map((node) => node as IssueFieldsFragment);
    },
    [searchText, sortQuery],
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} navigationTitle={props.repo} throttle>
      <List.Section title="Issues" subtitle={`${data?.length}`}>
        {data?.map((d) => <IssueListItem key={d.id} issue={d} {...{ mutateList, sortQuery, setSortQuery }} />)}
      </List.Section>
    </List>
  );
}
