import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";
import { fetchDeleteTag } from "./apis";
import { BookmarkList } from "./components/BookmarkList";
import { useConfig } from "./hooks/useConfig";
import { useGetAllTags } from "./hooks/useGetAllTags";
import { useGetTagsBookmarks } from "./hooks/useGetTagsBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import { runWithToast } from "./utils/toast";

export default function Tags() {
  const { push } = useNavigation();
  const { isLoading, tags, revalidate } = useGetAllTags();
  const { config } = useConfig();
  const { apiUrl } = config;
  const { t } = useTranslation();

  const dashboardTagsPage = (tagId: string) => {
    return `${apiUrl}/dashboard/tags/${tagId}`;
  };

  const handleShowTagBookmarks = (tagId: string, tagName: string) => {
    const TagBookmarks = () => {
      const {
        bookmarks,
        isLoading: isLoadingBookmarks,
        revalidate: revalidateBookmarks,
        pagination,
      } = useGetTagsBookmarks(tagId);

      return (
        <BookmarkList
          bookmarks={bookmarks}
          isLoading={isLoadingBookmarks}
          onRefresh={revalidateBookmarks}
          pagination={pagination}
          searchBarPlaceholder={t("tags.bookmarks.searchInTag", { name: tagName })}
          emptyViewTitle={t("tags.bookmarks.empty.title")}
          emptyViewDescription={t("tags.bookmarks.empty.description")}
        />
      );
    };

    push(<TagBookmarks />);
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      await runWithToast({
        loading: { title: t("tags.actions.deleteTag"), message: t("tags.toast.delete.loading") },
        success: { title: t("tags.actions.deleteTag"), message: t("tags.toast.delete.success") },
        failure: { title: t("tags.actions.deleteTag"), message: t("tags.toast.delete.error") },
        action: async () => {
          await fetchDeleteTag(tagId);
          await revalidate();
        },
      });
    } catch (error) {
      logger.error("Failed to delete tag", { tagId, error });
    }
  };

  const sortedTags = [...tags].sort((a, b) => b.numBookmarks - a.numBookmarks);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t("tags.searchPlaceholder")}>
      {sortedTags?.map((tag) => (
        <List.Item
          key={tag.id}
          icon={Icon.Hashtag}
          title={`${tag.name} (${tag.numBookmarks})`}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  onAction={() => handleShowTagBookmarks(tag.id, tag.name)}
                  title={t("tags.actions.viewBookmarks")}
                  icon={Icon.Eye}
                />
                <Action.OpenInBrowser url={dashboardTagsPage(tag.id)} title={t("tags.actions.openInBrowser")} />
                <Action.CopyToClipboard content={tag.name} title={t("tags.actions.copyTagName")} />
                <Action.CopyToClipboard
                  title={t("tags.actions.copyTagId")}
                  content={tag.id}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title={t("tags.actions.deleteTag")}
                  icon={Icon.Trash}
                  onAction={() => handleDeleteTag(tag.id)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
