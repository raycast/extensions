import { Action, ActionPanel, confirmAlert, Form, Icon, List, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchCreateTag, fetchDeleteTag, fetchUpdateTag } from "./apis";
import { BookmarkList } from "./components/BookmarkList";
import { useConfig } from "./hooks/useConfig";
import { useGetAllTags } from "./hooks/useGetAllTags";
import { useGetTagsBookmarks } from "./hooks/useGetTagsBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import { Tag } from "./types";
import { runWithToast } from "./utils/toast";

const log = logger.child("[Tags]");

function TagBookmarksView({ tagId, tagName }: { tagId: string; tagName: string }) {
  const { bookmarks, isLoading, revalidate, pagination } = useGetTagsBookmarks(tagId);
  const { t } = useTranslation();

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("tags.bookmarks.searchInTag", { name: tagName })}
      emptyViewTitle={t("tags.bookmarks.empty.title")}
      emptyViewDescription={t("tags.bookmarks.empty.description")}
    />
  );
}

interface TagFormValues {
  name: string;
}

function CreateTagForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();
  const { t } = useTranslation();

  const { handleSubmit, itemProps } = useForm<TagFormValues>({
    initialValues: { name: "" },
    validation: {
      name: (value) => (!value?.trim() ? t("tags.tagName") + " is required" : undefined),
    },
    async onSubmit(values) {
      log.info("Creating tag", { name: values.name });
      const result = await runWithToast({
        loading: { title: t("tags.toast.create.loading") },
        success: { title: t("tags.toast.create.success") },
        failure: { title: t("tags.toast.create.error") },
        action: async () => {
          await fetchCreateTag({ name: values.name.trim() });
          onCreated();
          log.info("Tag created", { name: values.name });
        },
      });
      if (result !== undefined) pop();
    },
  });

  return (
    <Form
      navigationTitle={t("tags.createTag")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("tags.createTag")} onSubmit={handleSubmit} icon={Icon.Plus} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title={t("tags.tagName")}
        placeholder={t("tags.tagNamePlaceholder")}
        autoFocus
      />
    </Form>
  );
}

function RenameTagForm({ tag, onRenamed }: { tag: Tag; onRenamed: () => void }) {
  const { pop } = useNavigation();
  const { t } = useTranslation();

  const { handleSubmit, itemProps } = useForm<TagFormValues>({
    initialValues: { name: tag.name },
    validation: {
      name: (value) => (!value?.trim() ? t("tags.tagName") + " is required" : undefined),
    },
    async onSubmit(values) {
      log.info("Renaming tag", { tagId: tag.id, name: values.name });
      const result = await runWithToast({
        loading: { title: t("tags.toast.rename.loading") },
        success: { title: t("tags.toast.rename.success") },
        failure: { title: t("tags.toast.rename.error") },
        action: async () => {
          await fetchUpdateTag(tag.id, { name: values.name.trim() });
          onRenamed();
          log.info("Tag renamed", { tagId: tag.id, name: values.name });
        },
      });
      if (result !== undefined) pop();
    },
  });

  return (
    <Form
      navigationTitle={t("tags.renameTag")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("tags.renameTag")} onSubmit={handleSubmit} icon={Icon.Pencil} />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title={t("tags.tagName")}
        placeholder={t("tags.tagNamePlaceholder")}
        autoFocus
      />
    </Form>
  );
}

export default function Tags() {
  const { push } = useNavigation();
  const { isLoading, tags, revalidate } = useGetAllTags();
  const { config } = useConfig();
  const { apiUrl } = config;
  const { t } = useTranslation();

  const dashboardTagsPage = (tagId: string) => {
    return `${apiUrl}/dashboard/tags/${tagId}`;
  };

  const handleDeleteTag = async (tagId: string) => {
    if (
      !(await confirmAlert({
        title: t("tags.actions.deleteTag"),
        message: t("tags.deleteConfirm"),
      }))
    ) {
      return;
    }

    await runWithToast({
      loading: { title: t("tags.toast.delete.loading") },
      success: { title: t("tags.toast.delete.success") },
      failure: { title: t("tags.toast.delete.error") },
      action: async () => {
        log.info("Deleting tag", { tagId });
        await fetchDeleteTag(tagId);
        await revalidate();
        log.info("Tag deleted", { tagId });
      },
    });
  };

  const handleCreateTag = () => {
    push(<CreateTagForm onCreated={revalidate} />);
  };

  const sortedTags = [...tags].sort((a, b) => b.numBookmarks - a.numBookmarks);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={t("tags.searchPlaceholder")}
      actions={
        <ActionPanel>
          <Action
            title={t("tags.actions.createTag")}
            onAction={handleCreateTag}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    >
      {!isLoading && tags.length === 0 && (
        <List.EmptyView
          title={t("tags.empty.title")}
          description={t("tags.empty.description")}
          icon={Icon.Hashtag}
          actions={
            <ActionPanel>
              <Action
                title={t("tags.actions.createTag")}
                onAction={handleCreateTag}
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      )}
      {sortedTags?.map((tag) => (
        <List.Item
          key={tag.id}
          icon={Icon.Hashtag}
          title={`${tag.name} (${tag.numBookmarks})`}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  onAction={() => push(<TagBookmarksView tagId={tag.id} tagName={tag.name} />)}
                  title={t("tags.actions.viewBookmarks")}
                  icon={Icon.Eye}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action
                  title={t("tags.actions.renameTag")}
                  onAction={() => push(<RenameTagForm tag={tag} onRenamed={revalidate} />)}
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title={t("tags.actions.createTag")}
                  onAction={handleCreateTag}
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
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
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteTag(tag.id)}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
