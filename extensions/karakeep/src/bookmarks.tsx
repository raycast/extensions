import { Icon, List, showToast, Toast } from "@raycast/api";
import { useFrecencySorting } from "@raycast/utils";
import { useCallback } from "react";
import { BookmarkList } from "./components/BookmarkList";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useTranslation } from "./hooks/useTranslation";

export default function BookmarksList() {
  const { t } = useTranslation();
  const { isLoading, bookmarks, revalidate, pagination } = useGetAllBookmarks();
  const { data: sortedBookmarks, visitItem } = useFrecencySorting(bookmarks, {
    namespace: "bookmarks",
  });

  const handleRefresh = useCallback(async () => {
    const toast = await showToast({
      title: t("refreshingBookmarks"),
      message: t("pleaseWait"),
    });

    try {
      await revalidate();
      toast.title = t("bookmarksRefreshed");
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = t("refreshError");
    }
  }, [t, revalidate]);

  if (isLoading && bookmarks.length === 0) {
    return (
      <List>
        <List.EmptyView title={t("loading")} icon={Icon.Airplane} description={t("pleaseWait")} />
      </List>
    );
  }

  return (
    <BookmarkList
      bookmarks={sortedBookmarks}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      pagination={pagination}
      searchBarPlaceholder={t("searchBookmarks")}
      onBookmarkVisit={visitItem}
    />
  );
}
