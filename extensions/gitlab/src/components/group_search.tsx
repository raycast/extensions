import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlab } from "../common";
import { Group } from "../gitlabapi";
import { getErrorMessage, showErrorToast } from "../utils";
import { GroupListEmptyView, GroupListItem } from "./groups";

export function GroupSearchList() {
  const [searchText, setSearchText] = useState<string>();
  const { groups, error, isLoading } = useSearch(searchText);

  if (error) {
    showErrorToast(error, "Cannot search group");
  }

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
  error?: string;
  isLoading: boolean;
} {
  const [groups, setGroups] = useState<Group[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const glGroups = await gitlab.getGroups({ searchText: query || "", searchIn: "title" });

        if (!didUnmount) {
          setGroups(glGroups);
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query]);

  return { groups, error, isLoading };
}
