import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAttachTagsToBookmark, fetchDetachTagsFromBookmark, fetchUpdateBookmark } from "../apis";
import { useGetAllTags } from "../hooks/useGetAllTags";
import { TAG_PICKER_NOOP_VALUE, useTagPicker } from "../hooks/useTagPicker";
import { useTranslation } from "../hooks/useTranslation";
import { Bookmark } from "../types";

const log = logger.child("[BookmarkEdit]");

interface FormValues {
  title: string;
  note: string;
}

interface BookmarkDetailProps {
  bookmark: Bookmark;
  onRefresh?: () => void;
}

export function BookmarkEdit({ bookmark, onRefresh }: BookmarkDetailProps) {
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
  } = useTagPicker({ tags, initialTagIds: bookmark.tags.map((t) => t.id) });

  const getDefaultTitle = (bookmark: Bookmark): string => {
    if (bookmark.title) {
      return bookmark.title;
    }
    switch (bookmark.content.type) {
      case "link":
        return bookmark.content.title || t("bookmark.untitled");
      case "text":
        return "";
      case "asset":
        if (bookmark.content.assetType === "image") {
          return bookmark.content.fileName || t("bookmark.untitledImage");
        } else if (bookmark.content.assetType === "pdf") {
          return bookmark.content.fileName || t("bookmark.untitled");
        }
        return t("bookmark.untitled");
      default:
        return t("bookmark.untitled");
    }
  };

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      title: getDefaultTitle(bookmark),
      note: bookmark.note || "",
    },
    async onSubmit(values) {
      log.info("Submitting bookmark update", { bookmarkId: bookmark.id });
      const toast = await showToast({ title: t("bookmark.updating"), style: Toast.Style.Animated });
      try {
        await fetchUpdateBookmark(bookmark.id, {
          title: values.title.trim(),
          note: values.note.trim(),
        });
        await Promise.all([
          addedTagIds.length > 0 ? fetchAttachTagsToBookmark(bookmark.id, buildTagsToAttach()) : undefined,
          removedTagIds.length > 0 ? fetchDetachTagsFromBookmark(bookmark.id, buildTagsToDetach()) : undefined,
        ]);
        toast.style = Toast.Style.Success;
        toast.title = t("bookmark.updateSuccess");
        log.info("Bookmark updated", { bookmarkId: bookmark.id });
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
      <Form.TextField
        {...itemProps.title}
        title={t("bookmark.customTitle")}
        placeholder={t("bookmark.titlePlaceholder")}
      />

      <Form.TextArea
        {...itemProps.note}
        title={t("bookmark.note")}
        placeholder={t("bookmark.notePlaceholder")}
        enableMarkdown
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
