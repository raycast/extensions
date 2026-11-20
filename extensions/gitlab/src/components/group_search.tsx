import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { gitlab } from "../common";
import { Group } from "../gitlabapi";
import { GroupListEmptyView, GroupListItem, usePinnedGroups } from "./groups";

export function GroupSearchList() {
  const [searchText, setSearchText] = useState<string>();
  const { groups, isLoading } = useSearch(searchText);
  const [pinnedGroups] = usePinnedGroups();

  const visiblePinnedGroups = useMemo(() => {
    const query = searchText?.trim().toLowerCase();
    return query ? pinnedGroups.filter((group) => group.full_name.toLowerCase().includes(query)) : pinnedGroups;
  }, [pinnedGroups, searchText]);

  const unpinnedGroups = useMemo(() => {
    const pinnedIds = new Set(pinnedGroups.map((group) => group.id));
    return groups?.filter((group) => !pinnedIds.has(group.id));
  }, [groups, pinnedGroups]);

  return (
    <List
      searchBarPlaceholder="Filter Groups by Name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
    >
      {visiblePinnedGroups.length > 0 && (
        <List.Section title="Pinned" subtitle={`${visiblePinnedGroups.length}`}>
          {visiblePinnedGroups.map((group) => (
            <GroupListItem key={group.id} group={group} />
          ))}
        </List.Section>
      )}
      <List.Section title="Groups" subtitle={`${unpinnedGroups?.length}`}>
        {unpinnedGroups?.map((group) => (
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
