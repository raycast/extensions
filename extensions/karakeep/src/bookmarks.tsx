import { Icon, List } from "@raycast/api";
import { useCallback, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { BookmarkList } from "./components/BookmarkList";
import { connectionGuard } from "./components/ConnectionErrorView";
import { useApiReachable, type ReachabilityState } from "./hooks/useApiReachable";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { List as BookmarkListType } from "./types";
import { useGetListsBookmarks } from "./hooks/useGetListsBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import { runWithToast } from "./utils/toast";
import { revalidated } from "./utils/fetchError";

const log = logger.child("[Bookmarks]");

function ListFilterDropdown({
  onChange,
  lists,
  reachability,
}: {
  onChange: (listId: string) => void;
  lists: BookmarkListType[];
  reachability: ReachabilityState;
}) {
  const { t } = useTranslation();

  // Gating the FETCH isn't enough to hide the filter: useCachedPromise still
  // returns the previous run's lists from disk, so the dropdown would offer
  // stale entries that select nothing while the server is down.
  if (reachability !== "reachable") return null;

  const sortedLists = [...lists].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <List.Dropdown tooltip="Filter by List" onChange={onChange}>
      <List.Dropdown.Item title={t("bookmark.defaultListFilter")} value="" />
      {sortedLists.map((list) => (
        <List.Dropdown.Item key={list.id} title={list.name} value={list.id} />
      ))}
    </List.Dropdown>
  );
}

function AllBookmarksView({
  searchBarAccessory,
  lists,
}: {
  searchBarAccessory: Parameters<typeof List>[0]["searchBarAccessory"];
  lists: BookmarkListType[];
}) {
  const { t } = useTranslation();
  const { isLoading, bookmarks, error, hasLiveData, revalidate, pagination } = useGetAllBookmarks();

  const handleRefresh = useCallback(async () => {
    await runWithToast({
      loading: { title: t("refreshingBookmarks"), message: t("pleaseWait") },
      success: { title: t("bookmarksRefreshed") },
      failure: { title: t("refreshError") },
      action: async () => {
        try {
          log.log("Refreshing bookmarks");
          await revalidated(revalidate);
          log.info("Bookmarks refreshed");
        } catch (error) {
          log.error("Failed to refresh bookmarks", { error });
          throw error;
        }
      },
    });
  }, [t, revalidate]);

  // Checked before the loading branch: with keepPreviousData a failed fetch can
  // still report isLoading, which would otherwise hold a spinner over a server
  // that is definitively unreachable.
  const guard = connectionGuard(error, hasLiveData, revalidate);
  if (guard) return guard;

  if (isLoading && bookmarks.length === 0) {
    return (
      <List searchBarAccessory={searchBarAccessory}>
        <List.EmptyView title={t("loading")} icon={Icon.Bookmark} description={t("pleaseWait")} />
      </List>
    );
  }

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      error={error}
      hasLiveData={hasLiveData}
      onRefresh={handleRefresh}
      pagination={pagination}
      searchBarPlaceholder={t("searchBookmarks")}
      emptyViewTitle={t("bookmarkList.emptySearch.title")}
      emptyViewDescription={t("bookmarkList.emptySearch.description")}
      searchBarAccessory={searchBarAccessory}
      lists={lists}
    />
  );
}

function ListBookmarksView({
  listId,
  listName,
  searchBarAccessory,
  lists,
}: {
  listId: string;
  listName: string;
  searchBarAccessory: Parameters<typeof List>[0]["searchBarAccessory"];
  lists: BookmarkListType[];
}) {
  const { t } = useTranslation();
  const { isLoading, bookmarks, error, hasLiveData, revalidate, pagination } = useGetListsBookmarks(listId);

  const guard = connectionGuard(error, hasLiveData, revalidate);
  if (guard) return guard;

  if (isLoading && bookmarks.length === 0) {
    return (
      <List searchBarAccessory={searchBarAccessory}>
        <List.EmptyView title={t("loading")} icon={Icon.Bookmark} description={t("pleaseWait")} />
      </List>
    );
  }

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      error={error}
      hasLiveData={hasLiveData}
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("searchBookmarks")}
      emptyViewTitle={t("bookmarkList.emptySearch.title")}
      emptyViewDescription={t("bookmarkList.emptySearch.description")}
      itemLabel={listName}
      searchBarAccessory={searchBarAccessory}
      lists={lists}
    />
  );
}

export default function BookmarksList() {
  // ONE probe for the whole command, passed down rather than called again in the
  // dropdown: useCachedPromise caches the VALUE, not the request, so a second
  // useApiReachable() here would fire a second /api/v1/users/me on every open.
  const { state: reachability } = useApiReachable();
  // Gated for the same reason the dropdown is: this fetch is what produced
  // "Couldn't load lists HTTP 401" on a command the user opened to see
  // BOOKMARKS. Pass the result down rather than letting BookmarkList fetch a
  // third copy for its Add to List submenu.
  const { lists } = useGetAllLists(reachability === "reachable");
  const [selectedListId, setSelectedListId] = useState("");

  const searchBarAccessory = (
    <ListFilterDropdown onChange={setSelectedListId} lists={lists} reachability={reachability} />
  );

  const selectedList = lists.find((l) => l.id === selectedListId);

  if (selectedListId && selectedList) {
    return (
      <ListBookmarksView
        listId={selectedListId}
        listName={selectedList.name}
        searchBarAccessory={searchBarAccessory}
        lists={lists}
      />
    );
  }

  return <AllBookmarksView searchBarAccessory={searchBarAccessory} lists={lists} />;
}
