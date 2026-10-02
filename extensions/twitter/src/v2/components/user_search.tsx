import { Action, ActionPanel, Icon, Image, Keyboard, List } from "@raycast/api";
import { ReactElement, useEffect, useRef, useState } from "react";
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
  const [data, setData] = useState<UserSearchResult[]>([]);
  const [error, setError] = useState<Error>();
  const [pending, setPending] = useState(0);
  const [revision, setRevision] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const revalidate = () => setRevision((value) => value + 1);
  const isLoading = pending > 0;

  useEffect(() => {
    const scan = new AbortController();
    controller.current = scan;
    setData([]);
    setError(undefined);
    setPending(query ? 2 : 0);
    if (!query) return () => scan.abort();
    const failed = (error: unknown) => {
      if (!scan.signal.aborted) setError(error instanceof Error ? error : new Error(String(error)));
    };
    const finished = () => {
      if (!scan.signal.aborted) setPending((value) => value - 1);
    };
    getExactUsernameMatch(query)
      .then((user) => {
        if (!scan.signal.aborted && user) {
          setData((results) => [{ user, source: "exact" }, ...results.filter((item) => item.user.id !== user.id)]);
        }
      })
      .catch(failed)
      .finally(finished);
    clientV2
      .searchMyConnections([query], undefined, scan.signal)
      .then((result) => {
        if (!scan.signal.aborted)
          setData((results) => [
            ...results,
            ...result.items
              .filter((user) => !results.some((item) => item.user.id === user.id))
              .map((user) => ({ user, source: result.relationshipsSearched.at(-1) ?? "following" })),
          ]);
      })
      .catch(failed)
      .finally(finished);
    return () => scan.abort();
  }, [query, revision]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(value) => {
        if (value.trim() !== query) controller.current?.abort();
        setSearch(value);
      }}
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
