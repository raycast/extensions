import { Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { BookmarkList } from "./components/BookmarkList";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useTranslation } from "./hooks/useTranslation";

export default function BookmarksList() {
  const { t } = useTranslation();
  const { isLoading, bookmarks, revalidate, pagination } = useGetAllBookmarks();

  const handleRefresh = useCallback(async () => {
    const toast = await showToast({
      title: t("refreshingBookmarks"),
      message: t("pleaseWait"),
    });

    try {
      revalidate();
      toast.title = t("bookmarksRefreshed");
    } catch (error) {
      logger.error("Failed to refresh bookmarks", error);
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
      bookmarks={bookmarks}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      pagination={pagination}
      searchBarPlaceholder={t("searchBookmarks")}
    />
  );
}
