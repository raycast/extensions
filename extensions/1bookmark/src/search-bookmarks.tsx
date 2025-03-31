import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { CachedQueryClientProvider } from "./components/CachedQueryClientProvider";
import { useCallback, useMemo, useState } from "react";

import { Spaces } from "./views/SpacesView";
import { BookmarkItem } from "./components/BookmarkItem";
import { BookmarkFilter } from "./components/BookmarkFilter";
import { LoginView } from "./views/LoginView";
import { useMe } from "./hooks/use-me.hook";
import { useMyBookmarks } from "./hooks/use-bookmarks.hook";
import { usePrepareBookmarkSearch } from "./hooks/use-prepare-bookmark-search.hook";
import { useBookmarkSearch } from "./hooks/use-bookmark-search.hook";
import { RequiredActions } from "./components/BookmarkItemActionPanel";
import { useLoggedOutStatus } from "./hooks/use-logged-out-status.hook";

export function Body() {
  const me = useMe();
  const [keyword, setKeyword] = useState("");

  const spaceIds = useMemo(() => {
    return me.data?.associatedSpaces.map((s) => s.id) || [];
  }, [me.data?.associatedSpaces]);

  const { data, isFetching, isFetched, refetch: refetchBookmarks } = useMyBookmarks();

  const refetch = useCallback(() => {
    refetchBookmarks();
    me.refetch();
  }, [refetchBookmarks, me.refetch]);

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

  const { loggedOutStatus } = useLoggedOutStatus();

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
