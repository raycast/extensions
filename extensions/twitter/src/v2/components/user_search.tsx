import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactElement, useState } from "react";
import { User } from "../lib/twitter";
import { clientV2, TwitterAPIError } from "../lib/twitterapi_v2";
import { AuthorTweetList } from "./author";

interface UserSearchResult {
  user: User;
  source: "exact" | "following" | "followers";
}

function normalizeUsername(value: string): string | undefined {
  const username = value.trim().replace(/^@/, "");
  return /^[A-Za-z0-9_]{1,15}$/.test(username) ? username : undefined;
}

async function getExactUsernameMatch(search: string): Promise<User | undefined> {
  const username = normalizeUsername(search);
  if (!username) return undefined;

  try {
    return await clientV2.getUserByUsername(username);
  } catch (error) {
    if (error instanceof TwitterAPIError && error.statusCode === 404) return undefined;
    throw error;
  }
}

async function searchUsers(search: string): Promise<UserSearchResult[]> {
  const query = search.trim();
  if (!query) return [];

  const [exactMatch, connectionMatches] = await Promise.all([
    getExactUsernameMatch(query),
    clientV2.searchMyConnections([query]),
  ]);
  const connectionSource = connectionMatches.relationshipsSearched.at(-1) ?? "following";
  const results: UserSearchResult[] = exactMatch ? [{ user: exactMatch, source: "exact" }] : [];

  for (const user of connectionMatches.items) {
    if (user.id !== exactMatch?.id) results.push({ user, source: connectionSource });
  }

  return results;
}

function UserSearchListItem({ result }: { result: UserSearchResult }): ReactElement {
  const { user, source } = result;
  const sourceLabel = source === "exact" ? "Exact Username" : source === "following" ? "Following" : "Follower";

  return (
    <List.Item
      id={user.id}
      title={user.name}
      subtitle={`@${user.username}`}
      keywords={[user.username, user.description ?? "", user.location ?? ""]}
      icon={user.profile_image_url ? { source: user.profile_image_url, mask: Image.Mask.Circle } : Icon.Person}
      accessories={[{ tag: sourceLabel }]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Recent Posts" icon={Icon.List} target={<AuthorTweetList authorID={user.id} />} />
          <Action.OpenInBrowser title="Open Profile on X" url={`https://x.com/${user.username}`} />
          <Action.CopyToClipboard title="Copy Username" content={`@${user.username}`} />
        </ActionPanel>
      }
    />
  );
}

export function SearchUserListV2(): ReactElement {
  const [search, setSearch] = useState("");
  const query = search.trim();
  const { data, error, isLoading, revalidate } = usePromise(searchUsers, [query], {
    execute: query.length > 0,
  });

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search by Name or Username"
      filtering={false}
      throttle
    >
      {data?.map((result) => (
        <UserSearchListItem key={result.user.id} result={result} />
      ))}
      {!isLoading && (
        <List.EmptyView
          icon={error ? Icon.ExclamationMark : Icon.Person}
          title={error ? "Could Not Search Users" : query ? "No Users Found" : "Search X Users"}
          description={
            error?.message ??
            (query
              ? "Try an exact username or search for someone in your following or followers."
              : "Find an exact username or search people you follow and people who follow you.")
          }
          actions={
            error ? (
              <ActionPanel>
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      )}
    </List>
  );
}
