import { List, Cache, ActionPanel, Action, Icon } from "@raycast/api";
import { CachedQueryClientProvider } from "./components/CachedQueryClientProvider";
import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sessionTokenAtom } from "@/states/session-token.state";
import { Spaces } from "./views/SpacesView";
import { BookmarkItem } from "./components/BookmarkItem";
import { BookmarkFilter } from "./components/BookmarkFilter";
import { LoginView } from "./views/LoginView";
import { useMe } from "./hooks/use-me.hook";
import { useBookmarks } from "./hooks/use-bookmarks.hook";
import { usePrepareBookmarkSearch } from "./hooks/use-prepare-bookmark-search.hook";
import { useBookmarkSearch } from "./hooks/use-bookmark-search.hook";
import { RequiredActions } from "./components/BookmarkItemActionPanel";

const cache = new Cache();

export function Body() {
  const [sessionToken] = useAtom(sessionTokenAtom);
  const me = useMe(sessionToken);
  const [keyword, setKeyword] = useState("");

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

  const selectedTags = useMemo(() => {
    if (!me.data) return [];

    return me.data.associatedSpaces.flatMap((space) => {
      return space.myTags.map((tag) => `${space.id}:${tag}`);
    });
  }, [me.data]);

  // Prepare bookmark data for fuzzysort search
  // The prepare operation is performed only once if the data doesn't change
  const searchData = usePrepareBookmarkSearch({
    data,
    selectedTags,
  });

  // Perform actual search using prepared data
  // Search results are updated whenever the keyword changes
  const { filteredTaggedList, filteredUntaggedList } = useBookmarkSearch({
    keyword,
    searchData,
  });

  const [after1Sec, setAfter1Sec] = useState(false);
  useEffect(() => {
    // If this is not here, LoginView will briefly appear.
    setTimeout(() => setAfter1Sec(true), 1000);
  }, []);

  const loggedOutStatus = !sessionToken && after1Sec;
  useEffect(() => {
    // Clear data when logged out.
    if (loggedOutStatus) {
      cache.remove("me");
      cache.remove("bookmarks");
    }
  }, [loggedOutStatus]);

  if (loggedOutStatus) {
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
