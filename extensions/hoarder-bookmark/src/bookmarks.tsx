import { Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { BookmarkList } from "./components/BookmarkList";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useTranslation } from "./hooks/useTranslation";

export default function BookmarksList() {
  const { t } = useTranslation();
  const { isLoading, bookmarks, hasMore, revalidate, loadNextPage } = useGetAllBookmarks();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && isInitialLoading) {
      setIsInitialLoading(false);
    }
  }, [isLoading]);

  const handleRefresh = async () => {
    const toast = await showToast({
      title: t("refreshingBookmarks"),
      message: t("pleaseWait"),
    });

    try {
      await revalidate();
      toast.title = t("bookmarksRefreshed");
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = t("refreshError");
    }
  };
  if (isInitialLoading) {
    return (
      <List>
        <List.EmptyView title={t("loading")} icon={Icon.Airplane} description={t("pleaseWait")} />
      </List>
    );
  }

  return (
    <BookmarkList
      bookmarks={bookmarks}
      hasMore={hasMore}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      loadMore={loadNextPage}
      searchBarPlaceholder={t("searchBookmarks")}
    />
  );
}
