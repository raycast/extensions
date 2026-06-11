import { Icon, List } from "@raycast/api";
import { useCallback, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { BookmarkList } from "./components/BookmarkList";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useGetListsBookmarks } from "./hooks/useGetListsBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import { runWithToast } from "./utils/toast";

const log = logger.child("[Bookmarks]");

function ListFilterDropdown({ onChange }: { onChange: (listId: string) => void }) {
  const { t } = useTranslation();
  const { lists } = useGetAllLists();

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
}: {
  searchBarAccessory: Parameters<typeof List>[0]["searchBarAccessory"];
}) {
  const { t } = useTranslation();
  const { isLoading, bookmarks, revalidate, pagination } = useGetAllBookmarks();

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
      onRefresh={handleRefresh}
      pagination={pagination}
      searchBarPlaceholder={t("searchBookmarks")}
      emptyViewTitle={t("bookmarkList.emptySearch.title")}
      emptyViewDescription={t("bookmarkList.emptySearch.description")}
      searchBarAccessory={searchBarAccessory}
    />
  );
}

function ListBookmarksView({
  listId,
  listName,
  searchBarAccessory,
}: {
  listId: string;
  listName: string;
  searchBarAccessory: Parameters<typeof List>[0]["searchBarAccessory"];
}) {
  const { t } = useTranslation();
  const { isLoading, bookmarks, revalidate, pagination } = useGetListsBookmarks(listId);

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
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("searchBookmarks")}
      emptyViewTitle={t("bookmarkList.emptySearch.title")}
      emptyViewDescription={t("bookmarkList.emptySearch.description")}
      itemLabel={listName}
      searchBarAccessory={searchBarAccessory}
    />
  );
}

export default function BookmarksList() {
  const { lists } = useGetAllLists();
  const [selectedListId, setSelectedListId] = useState("");

  const searchBarAccessory = <ListFilterDropdown onChange={setSelectedListId} />;

  const selectedList = lists.find((l) => l.id === selectedListId);

  if (selectedListId && selectedList) {
    return (
      <ListBookmarksView listId={selectedListId} listName={selectedList.name} searchBarAccessory={searchBarAccessory} />
    );
  }

  return <AllBookmarksView searchBarAccessory={searchBarAccessory} />;
}
