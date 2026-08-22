import { Color, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { getGitHubClient } from "../api/githubClient";
import { DiscussionFieldsFragment } from "../generated/graphql";
import { DISCUSSION_DEFAULT_SORT_QUERY, formatDateForQuery } from "../helpers/discussion";

import { DiscussionListItem } from "./DiscussionListItem";

const DISCUSSIONS_PAGE_SIZE = 20;

function DiscussionFilterDropdown(props: { value: string; onChange?: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Filter" value={props.value} onChange={props.onChange}>
      <List.Dropdown.Item value="" title="All" icon={Icon.SpeechBubble} />
      <List.Dropdown.Item value="answered" title="Answered" icon={{ source: Icon.Checkmark, tintColor: Color.Green }} />
      <List.Dropdown.Item value="unanswered" title="Unanswered" icon={Icon.Circle} />
      <List.Dropdown.Item value="locked" title="Locked" icon={Icon.Lock} />
      <List.Dropdown.Item value="unlocked" title="Unlocked" icon={Icon.LockUnlocked} />
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

  const { data, isLoading, pagination } = useCachedPromise(
    (searchText, filterText, sortTxt) => async (options: { page: number; cursor?: string }) => {
      const result = await github.searchDiscussions({
        query: `${repoFilter} ${filterText} ${formatDateForQuery(sortTxt)} ${searchText}`.replace(/\s+/g, " ").trim(),
        numberOfItems: DISCUSSIONS_PAGE_SIZE,
        after: options.page > 0 ? options.cursor : undefined,
      });
      return {
        data: result.searchDiscussions.nodes?.map((d) => d as DiscussionFieldsFragment) ?? [],
        hasMore: result.searchDiscussions.pageInfo.hasNextPage,
        cursor: result.searchDiscussions.pageInfo.endCursor ?? undefined,
      };
    },
    [searchText, filterText, sortQuery],
  );

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      navigationTitle={props.repository}
      throttle
      pagination={pagination}
      searchBarAccessory={<DiscussionFilterDropdown value={filter} onChange={setFilter} />}
    >
      <List.Section title="Discussions" subtitle={`${data?.length ?? 0}`}>
        {data?.map((d) => <DiscussionListItem key={d.id} discussion={d} {...{ sortQuery, setSortQuery }} />)}
      </List.Section>
    </List>
  );
}
