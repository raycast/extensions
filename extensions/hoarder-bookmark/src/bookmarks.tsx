import { Icon, List, showToast } from "@raycast/api";
import { BookmarkList } from "./components/BookmarkList";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useTranslation } from "./hooks/useTranslation";
export default function BookmarksList() {
  const { t } = useTranslation();
  const { isLoading, bookmarks, revalidate } = useGetAllBookmarks();
  const handleRefresh = async () => {
    const toast = await showToast({
      title: t("refreshingBookmarks"),
      message: t("pleaseWait"),
    });
    await revalidate();
    toast.title = t("bookmarksRefreshed");
  };

  if (isLoading) {
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
      searchBarPlaceholder={t("searchBookmarks")}
    />
  );
}
