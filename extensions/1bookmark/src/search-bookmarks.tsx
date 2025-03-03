import { List, Cache, ActionPanel, Action, Icon } from "@raycast/api";
import { CachedQueryClientProvider } from "./components/CachedQueryClientProvider";
import { trpc } from "@/utils/trpc.util";
import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sessionTokenAtom } from "@/states/session-token.state";
import { Spaces } from "./views/SpacesView";
import { BookmarkItem } from "./components/BookmarkItem";
import { BookmarkFilter } from "./components/BookmarkFilter";
import { LoginView } from "./views/LoginView";
import { useMe } from "./hooks/use-me.hook";
import { useBookmarks } from "./hooks/use-bookmarks.hook";
import { Bookmark } from "./types";
import { useBookmarkSearches } from "./hooks/use-bookmark-searchs.hook";
import { RequiredActions } from "./components/BookmarkItemActionPanel";

const cache = new Cache();

export function Body() {
  const [sessionToken, setSessionToken] = useAtom(sessionTokenAtom);
  const trpcUtils = trpc.useUtils();
  const me = useMe(sessionToken);

  const spaceIds = useMemo(() => {
    return me?.data?.associatedSpaces.map((s) => s.id) || [];
  }, [me.data]);

  const {
    data,
    isFetching,
    isFetched,
    refetch: refetchBookmarks,
  } = useBookmarks({
    sessionToken,
    spaceIds,
    me: me.data,
  });

  const refetch = useCallback(() => {
    refetchBookmarks();
    me.refetch();
    setAfter1Sec(false);
    setTimeout(() => setAfter1Sec(true), 1000);
  }, [refetchBookmarks]);

  const [after1Sec, setAfter1Sec] = useState(false);

  useEffect(() => {
    // If this is not here, LoginView will briefly appear.
    setTimeout(() => setAfter1Sec(true), 1000);
  }, []);

  useEffect(() => {
    if (!me.error) return;

    // Login failed maybe due to token expiration.
    // Clear sessionToken and send to LoginView.
    setSessionToken("");
  }, [me.error, setSessionToken]);

  useEffect(() => {
    // Clear data when logging out.
    if (sessionToken) return;
    if (!me.data && !data) return;
    if (!after1Sec) return;

    cache.remove("me");
    cache.remove("bookmarks");
  }, [sessionToken, trpcUtils, spaceIds, me.data, data, after1Sec]);

  const [keyword, setKeyword] = useState("");

  const selectedTags = useMemo(() => {
    if (!me.data) return [];

    return me.data.associatedSpaces.flatMap((space) => {
      return space.myTags.map((tag) => `${space.id}:${tag}`);
    });
  }, [me.data]);

  const { searchInTags, searchInUntagged, taggedBookmarks, untaggedBookmarks } = useBookmarkSearches({
    data,
    selectedTags,
  });

  const { filteredTaggedList, filteredUntaggedList } = useMemo(() => {
    if (!searchInTags || !searchInUntagged || keyword === "") {
      return {
        filteredTaggedList: taggedBookmarks,
        filteredUntaggedList: untaggedBookmarks,
      };
    }

    if (keyword.startsWith("#")) {
      return {
        filteredTaggedList: searchInTags.search(`slack ${keyword}`, {
          prefix: true,
          combineWith: "AND",
        }) as unknown as Bookmark[],
        filteredUntaggedList: searchInUntagged.search(`slack ${keyword}`, {
          prefix: true,
          combineWith: "AND",
        }) as unknown as Bookmark[],
      };
    }

    return {
      filteredTaggedList: searchInTags.search(keyword, { prefix: true, combineWith: "AND" }) as unknown as Bookmark[],
      filteredUntaggedList: searchInUntagged.search(keyword, {
        prefix: true,
        combineWith: "AND",
      }) as unknown as Bookmark[],
    };
  }, [searchInTags, searchInUntagged, keyword, taggedBookmarks, untaggedBookmarks]);

  if (!sessionToken && after1Sec) {
    return <LoginView />;
  }

  if (!data) {
    return <List isLoading={true} />;
  }

  if (isFetched && data.length === 0) {
    return (
      <List isLoading={isFetching || !me.data}>
        <List.Item
          title="No bookmark. Add a bookmark to get started"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <RequiredActions refetch={refetch} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Spaces"
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push title="Spaces" icon={Icon.Folder} target={<Spaces />} />
              <RequiredActions refetch={refetch} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isFetching || !me.data}
      searchBarAccessory={me.data && <BookmarkFilter spaceIds={spaceIds} me={me.data} />}
      searchText={keyword}
      onSearchTextChange={setKeyword}
    >
      <List.Section
        title={`${filteredTaggedList.length} tagged out of ${filteredTaggedList.length + filteredUntaggedList.length} results`}
      >
        {filteredTaggedList.map((item) => (
          <BookmarkItem key={item.id} bookmark={item} me={me.data} refetch={refetch} />
        ))}
      </List.Section>
      <List.Section
        title={`${filteredUntaggedList.length} untagged out of ${filteredTaggedList.length + filteredUntaggedList.length} results`}
      >
        {filteredUntaggedList.map((item) => (
          <BookmarkItem key={item.id} bookmark={item} me={me.data} refetch={refetch} />
        ))}
      </List.Section>
    </List>
  );
}

export default function Bookmarks() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
}
