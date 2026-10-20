import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  Image,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { EmoteBrowser } from "./search";
import {
  createSevenTVUserSource,
  searchSevenTVUsers,
  type SevenTVUser,
  type UserEmoteMode,
} from "./user-emotes";

export default function UserBrowser({ mode }: { mode: UserEmoteMode }) {
  const { push } = useNavigation();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SevenTVUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    if (!query.trim()) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    setError(undefined);
    const timer = setTimeout(async () => {
      try {
        const result = await searchSevenTVUsers(query, page, controller.signal);
        if (id !== requestId.current) return;
        setUsers((previous) => [
          ...new Map(
            (page === 1 ? result.items : [...previous, ...result.items]).map(
              (user) => [user.id, user],
            ),
          ).values(),
        ]);
        setHasMore(result.hasMore);
      } catch (error) {
        if (controller.signal.aborted || id !== requestId.current) return;
        setError(String(error));
        setHasMore(false);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, page, retry]);
  const changeQuery = (text: string) => {
    if (text === query) return;
    requestId.current++;
    setUsers([]);
    setPage(1);
    setHasMore(false);
    setError(undefined);
    setQuery(text);
  };
  const title =
    mode === "channel" ? "Browse Channel Emotes" : "Browse Creator Emotes";
  return (
    <Grid
      navigationTitle={title}
      columns={5}
      fit={Grid.Fit.Contain}
      searchBarPlaceholder="Search 7TV users..."
      searchText={query}
      onSearchTextChange={changeQuery}
      filtering={false}
      isLoading={loading}
      pagination={{
        pageSize: 30,
        hasMore,
        onLoadMore: () => {
          if (hasMore && !loading) setPage((page) => page + 1);
        },
      }}
    >
      {users.map((user) => (
        <Grid.Item
          key={user.id}
          id={user.id}
          title={user.name}
          subtitle={`${user.platform} · ${user.handle}`}
          content={{
            source: user.avatar ?? Icon.Person,
            mask: Image.Mask.Circle,
          }}
          actions={
            <ActionPanel>
              <Action
                title={
                  mode === "channel"
                    ? "Show Channel Emotes"
                    : "Show Uploaded Emotes"
                }
                icon={Icon.AppWindowGrid3x3}
                onAction={() =>
                  push(
                    <EmoteBrowser
                      source={createSevenTVUserSource(user, mode)}
                    />,
                  )
                }
              />
              <Action.OpenInBrowser
                title="View User on 7TV"
                url={`https://7tv.app/users/${user.id}`}
              />
              <Action
                title="Reload Users"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  requestId.current++;
                  setUsers([]);
                  setPage(1);
                  setHasMore(false);
                  setRetry((value) => value + 1);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {users.length === 0 && (
        <Grid.EmptyView
          title={
            !query.trim()
              ? "Find a 7TV User"
              : error
                ? "User Search Failed"
                : loading
                  ? "Searching Users"
                  : "No Users Found"
          }
          description={
            error ??
            (mode === "channel"
              ? "Choose a user to browse their active channel emote set."
              : "Choose a creator to browse their public uploads.")
          }
          actions={
            <ActionPanel>
              <Action
                title="Retry Search"
                onAction={() => setRetry((value) => value + 1)}
              />
            </ActionPanel>
          }
        />
      )}
    </Grid>
  );
}
