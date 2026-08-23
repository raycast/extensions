import { Icon, List } from "@raycast/api";
import { useCallback, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { BookmarkList } from "./components/BookmarkList";
import { connectionGuard } from "./components/ConnectionErrorView";
import { useApiReachable } from "./hooks/useApiReachable";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { List as BookmarkListType } from "./types";
import { useGetListsBookmarks } from "./hooks/useGetListsBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import { runWithToast } from "./utils/toast";

const log = logger.child("[Bookmarks]");

function ListFilterDropdown({ onChange }: { onChange: (listId: string) => void }) {
  const { t } = useTranslation();
  // The dropdown mounts alongside the bookmarks fetch, so against a dead server
  // it fires its own doomed /api/v1/lists request and raises Raycast's opaque
  // "fetch failed" toast over the top of our recovery view.
  const { state: reachability } = useApiReachable();
  const { lists } = useGetAllLists(reachability === "reachable");

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
          await revalidate();
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
  // useCachedPromise caches the VALUE, not the request — it runs its promise
  // once per hook instance — so this is a genuinely separate fetch from
  // ListFilterDropdown's. Pass the result down rather than letting BookmarkList
  // fetch a third copy for its Add to List submenu.
  const { lists } = useGetAllLists();
  const [selectedListId, setSelectedListId] = useState("");

  const searchBarAccessory = <ListFilterDropdown onChange={setSelectedListId} />;

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
