// src/components/NoteEdit.tsx

import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAttachTagsToBookmark, fetchDetachTagsFromBookmark, fetchUpdateBookmark } from "../apis";
import { useGetAllTags } from "../hooks/useGetAllTags";
import { TAG_PICKER_NOOP_VALUE, useTagPicker } from "../hooks/useTagPicker";
import { useTranslation } from "../hooks/useTranslation";
import { Bookmark } from "../types";

const log = logger.child("[NoteEdit]");

const MAX_NOTE_LENGTH = 2500;

interface NoteEditProps {
  bookmark: Bookmark;
  onRefresh?: () => void;
}

interface FormValues {
  content: string;
  title: string;
}

export function NoteEdit({ bookmark, onRefresh }: NoteEditProps) {
  const { pop } = useNavigation();
  const { t } = useTranslation();
  const { tags } = useGetAllTags();
  const {
    selectedTagIds,
    newTagItems,
    pendingInput,
    onTagIdsChange,
    onPendingInputChange,
    commitPendingTag,
    addedTagIds,
    removedTagIds,
    buildTagsToAttach,
    buildTagsToDetach,
  } = useTagPicker({ tags, initialTagIds: bookmark.tags.map((tag) => tag.id) });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      // BookmarkContent has text?: string as an optional field on a flat interface
      // (not a discriminated union), so this access is safe without a cast.
      content: bookmark.content.text ?? "",
      title: bookmark.title ?? "",
    },
    validation: {
      content: (value) => {
        if (!value || value.trim().length === 0) return t("bookmark.contentRequired");
        if (value.length > MAX_NOTE_LENGTH) return t("bookmark.contentTooLong");
        return undefined;
      },
    },
    async onSubmit(values) {
      log.info("Updating note", { bookmarkId: bookmark.id });
      const toast = await showToast({ title: t("bookmark.updating"), style: Toast.Style.Animated });
      try {
        await fetchUpdateBookmark(bookmark.id, {
          title: values.title.trim(),
          text: values.content.trim(),
        });
        await Promise.all([
          addedTagIds.length > 0 ? fetchAttachTagsToBookmark(bookmark.id, buildTagsToAttach()) : undefined,
          removedTagIds.length > 0 ? fetchDetachTagsFromBookmark(bookmark.id, buildTagsToDetach()) : undefined,
        ]);
        toast.style = Toast.Style.Success;
        toast.title = t("bookmark.updateSuccess");
        log.info("Note updated", { bookmarkId: bookmark.id });
        await onRefresh?.();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = t("bookmark.updateFailed");
        toast.message = String(error);
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("bookmark.update")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        {...itemProps.content}
        title={t("bookmark.content")}
        placeholder={t("bookmark.contentPlaceholder")}
        enableMarkdown
      />

      <Form.TextField
        {...itemProps.title}
        title={t("bookmark.customTitle")}
        placeholder={t("bookmark.titlePlaceholder")}
      />

      <Form.TagPicker
        id="tagIds"
        title={t("bookmark.tags")}
        placeholder={t("bookmark.tagsPlaceholder")}
        value={selectedTagIds}
        onChange={onTagIdsChange}
      >
        <Form.TagPicker.Item value={TAG_PICKER_NOOP_VALUE} title=" " />
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
        {newTagItems.map((item) => (
          <Form.TagPicker.Item key={item.id} value={item.id} title={item.name} />
        ))}
      </Form.TagPicker>

      <Form.TextField
        id="pendingNewTag"
        title={t("bookmark.newTags")}
        placeholder={t("bookmark.newTagsPlaceholder")}
        value={pendingInput}
        onChange={onPendingInputChange}
        onBlur={commitPendingTag}
      />
    </Form>
  );
}
