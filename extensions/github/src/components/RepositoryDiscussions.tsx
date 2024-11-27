import { List } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useState } from "react";

import { getGitHubClient } from "../api/githubClient";
import { DiscussionFieldsFragment } from "../generated/graphql";
import { DISCUSSION_DEFAULT_SORT_QUERY, formatDateForQuery } from "../helpers/discussion";

import { DiscussionListItem } from "./DiscussionListItem";

function DiscussionFilterDropdown(props: { onChange?: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Filter" onChange={props.onChange}>
      <List.Dropdown.Item value="" title="All" />
      <List.Dropdown.Item value="answered" title="Answered" />
      <List.Dropdown.Item value="unanswered" title="Unanswered" />
      <List.Dropdown.Item value="locked" title="Locked" />
      <List.Dropdown.Item value="unlocked" title="Unlocked" />
    </List.Dropdown>
  );
}

export function RepositoryDiscussionList(props: { repository: string }) {
  const { github } = getGitHubClient();
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("");
  const [sortQuery, setSortQuery] = useCachedState<string>("sort-query", DISCUSSION_DEFAULT_SORT_QUERY, {
    cacheNamespace: "github-repo-discussion",
  });

  const filterText = filter.length > 0 ? `is:${filter}` : "";

  const repoFilter = props.repository && props.repository.length > 0 ? `repo:${props.repository}` : "";

  const { data, isLoading } = usePromise(
    async (searchText, filter, sortTxt) => {
      const result = await github.searchDiscussions({
        query: `${repoFilter} ${filter} ${formatDateForQuery(sortTxt)} ${searchText}`,
        numberOfOpenItems: 20,
      });
      return result.searchDiscussions.nodes?.map((d) => d as DiscussionFieldsFragment);
    },
    [searchText, filterText, sortQuery],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      navigationTitle={props.repository}
      throttle
      searchBarAccessory={<DiscussionFilterDropdown onChange={setFilter} />}
    >
      <List.Section title="Discussions" subtitle={`${data?.length}`}>
        {data?.map((d) => <DiscussionListItem key={d.id} discussion={d} {...{ sortQuery, setSortQuery }} />)}
      </List.Section>
    </List>
  );
}
