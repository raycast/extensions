import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { gitlab } from "../common";
import { Group } from "../gitlabapi";
import { GroupListEmptyView, GroupListItem } from "./groups";

export function GroupSearchList() {
  const [searchText, setSearchText] = useState<string>();
  const { groups, isLoading } = useSearch(searchText);

  return (
    <List
      searchBarPlaceholder="Filter Groups by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      <List.Section title="Groups" subtitle={`${groups?.length}`}>
        {groups?.map((group) => (
          <GroupListItem key={group.id} group={group} />
        ))}
      </List.Section>
      <GroupListEmptyView />
    </List>
  );
}

export function useSearch(query: string | undefined): {
  groups?: Group[];
  isLoading: boolean;
} {
  const { data, isLoading } = usePromise(
    (searchQuery: string) => gitlab.getGroups({ searchText: searchQuery, searchIn: "title" }),
    [query ?? ""],
  );
  return { groups: data, isLoading };
}
