import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { fetchDeleteTag } from "./apis";
import { BookmarkList } from "./components/BookmarkList";
import { TAG_AI_COLOR, TAG_HUMAN_COLOR } from "./constants";
import { useConfig } from "./hooks/useConfig";
import { useGetAllTags } from "./hooks/useGetAllTags";
import { useGetTagsBookmarks } from "./hooks/useGetTagsBookmarks";
import { useTranslation } from "./hooks/useTranslation";

const { Metadata } = List.Item.Detail;

export default function Tags() {
  const { push } = useNavigation();
  const { isLoading, tags, revalidate } = useGetAllTags();
  const { config } = useConfig();
  const { host } = config;
  const { t } = useTranslation();

  const dashboardTagsPage = (tagId: string) => {
    return `${host}/dashboard/tags/${tagId}`;
  };

  const handleShowTagBookmarks = (tagId: string, tagName: string) => {
    const TagBookmarks = () => {
      const { bookmarks, isLoading: isLoadingBookmarks, revalidate: revalidateBookmarks } = useGetTagsBookmarks(tagId);

      return (
        <BookmarkList
          bookmarks={bookmarks}
          isLoading={isLoadingBookmarks}
          onRefresh={revalidateBookmarks}
          searchBarPlaceholder={`In ${tagName} tag search...`}
          emptyViewTitle="No bookmarks found"
          emptyViewDescription="No bookmarks in this tag yet"
        />
      );
    };

    push(<TagBookmarks />);
  };

  const handleDeleteTag = async (tagId: string) => {
    const toast = await showToast({ title: "Delete tag", message: "Deleting tag...", style: Toast.Style.Animated });
    try {
      await fetchDeleteTag(tagId);
      toast.title = "Delete tag";
      toast.message = "Tag deleted successfully";
      toast.style = Toast.Style.Success;
      await revalidate();
    } catch (error) {
      toast.title = "Delete tag";
      toast.message = "Tag deletion failed";
      toast.style = Toast.Style.Failure;
    }
  };

  const sortedTags = tags.sort((a, b) => b.numBookmarks - a.numBookmarks);

  return (
    <List isLoading={isLoading} searchBarPlaceholder={t("tags.searchPlaceholder")}>
      {sortedTags?.map((tag) => (
        <List.Item
          key={tag.id}
          icon={Icon.Hashtag}
          title={`${tag.name} (${tag.numBookmarks})`}
          detail={
            <List.Item.Detail
              metadata={
                <Metadata>
                  <Metadata.Label title={t("tags.detail.name")} text={tag.name} />
                  <Metadata.Label title={t("tags.detail.id")} text={tag.id} icon={Icon.Tag} />
                  <Metadata.Separator />
                  <Metadata.Label
                    title={t("tags.detail.totalBookmarks")}
                    text={String(tag.numBookmarks)}
                    icon={Icon.Tag}
                  />
                  <Metadata.TagList title={t("tags.detail.source")}>
                    <Metadata.TagList.Item text={`AI: ${tag.numBookmarksByAttachedType.ai}`} color={TAG_AI_COLOR} />
                    <Metadata.TagList.Item
                      text={`Human: ${tag.numBookmarksByAttachedType.human}`}
                      color={TAG_HUMAN_COLOR}
                    />
                  </Metadata.TagList>
                </Metadata>
              }
            />
          }
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
