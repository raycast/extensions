import { useEffect, useMemo, useState } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { useArena } from "./hooks/useArena";
import type { ApiMeta, SearchSort, User } from "./api/types";
import { useCachedPromise, withAccessToken } from "@raycast/utils";
import { userIcon } from "./utils/icons";
import { addRecentQuery } from "./utils/searchHistory";
import { arenaOAuth } from "./api/oauth";
import { getDefaultSort, getPageSize } from "./utils/preferences";

function UserActions({ user }: { user: User }) {
  return (
    <ActionPanel title={user.full_name ?? ""}>
      <ActionPanel.Section>
        {user.slug && <Action.OpenInBrowser url={`https://www.are.na/${user.slug}`} />}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {user.slug && (
          <Action.CopyToClipboard
            title="Copy Link"
            content={`https://www.are.na/${user.slug}`}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function UserListItem({ user }: { user: User }) {
  return (
    <List.Item
      icon={userIcon(user)}
      title={user.full_name ?? ""}
      subtitle={`@${user.slug}`}
      accessories={[
        { text: `${user.channel_count}`, icon: Icon.AppWindowGrid2x2, tooltip: "Channels" },
        { text: `${user.follower_count}`, icon: Icon.Person, tooltip: "Followers" },
      ]}
      actions={<UserActions user={user} />}
    />
  );
}

function Command() {
  const arena = useArena();
  const pageSize = getPageSize();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SearchSort>(() => getDefaultSort() as SearchSort);
  const trimmedQuery = query.trim();
  const [listMeta, setListMeta] = useState<ApiMeta | undefined>();
  useEffect(() => {
    if (!trimmedQuery) setListMeta(undefined);
  }, [trimmedQuery]);

  const {
    data: users = [],
    isLoading,
    pagination,
  } = useCachedPromise(
    (q: string, sortArg: SearchSort) =>
      async ({ page }) => {
        const response = await arena.search(q).users({ page: page + 1, per: pageSize, sort: sortArg });
        if (page === 0) {
          await addRecentQuery(q);
          setListMeta(response.meta);
        }
        const seen = new Set<number>();
        const unique = response.users.filter((u) => {
          if (seen.has(u.id)) return false;
          seen.add(u.id);
          return true;
        });
        return { data: unique, hasMore: response.meta?.has_more_pages ?? false };
      },
    [trimmedQuery, sort],
    {
      initialData: [],
      keepPreviousData: true,
      execute: trimmedQuery.length > 0,
      failureToastOptions: { title: "Failed to fetch users" },
    },
  );

  const uniqueUsers = useMemo(() => {
    const seen = new Set<number>();
    return (users ?? []).filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [users]);

  const sectionTitle = listMeta?.total_count ? `Users (${listMeta.total_count})` : undefined;

  return (
    <List
      isLoading={isLoading}
      pagination={trimmedQuery ? pagination : undefined}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search users"
      searchBarAccessory={
        <List.Dropdown tooltip="Sort Users" value={sort} onChange={(newValue) => setSort(newValue as SearchSort)}>
          <List.Dropdown.Item value="score_desc" title="Best Match" />
          <List.Dropdown.Item value="updated_at_desc" title="Recently Updated" />
          <List.Dropdown.Item value="created_at_desc" title="Recently Created" />
          <List.Dropdown.Item value="name_asc" title="Name A-Z" />
        </List.Dropdown>
      }
    >
      {!query.trim() ? (
        <List.EmptyView
          icon={{ source: "extension-icon.png" }}
          title="Search Are.na Users"
          description="Type a name to get started"
        />
      ) : isLoading && uniqueUsers.length === 0 ? (
        <List.EmptyView icon={{ source: "extension-icon.png" }} title={`Searching "${query}"...`} />
      ) : uniqueUsers.length === 0 ? (
        <List.EmptyView title="No users found" description="Try a different search term" />
      ) : (
        <List.Section title={sectionTitle}>
          {uniqueUsers.map((user) => (
            <UserListItem user={user} key={user.id} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(arenaOAuth)(Command);
