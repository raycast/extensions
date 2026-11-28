import { Action, ActionPanel, Form, useNavigation, closeMainWindow } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAddBookmarkToList, fetchAttachTagsToBookmark, fetchCreateBookmark } from "./apis";
import { BookmarkDetail } from "./components/BookmarkDetail";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useGetAllTags } from "./hooks/useGetAllTags";
import { useTagPicker, TAG_PICKER_NOOP_VALUE } from "./hooks/useTagPicker";
import { useTranslation } from "./hooks/useTranslation";
import { runWithToast } from "./utils/toast";
import { ensureReachable } from "./utils/submitGuard";
import { useApiReachable } from "./hooks/useApiReachable";
import { OfflineFormNotice, OpenSettingsAction, StartKarakeepAction } from "./components/OfflineFormNotice";

const log = logger.child("[CreateNote]");

interface FormValues {
  content: string;
  list?: string;
}

const MAX_NOTE_LENGTH = 2500;
const NOTE_DRAFT_KEY = "create-note-draft";

export default function CreateNoteView() {
  const { push } = useNavigation();
  const { t } = useTranslation();
  // Held until the API is known to be up — see useApiReachable.
  const {
    state: reachability,
    reachable: apiReachable,
    offline,
    unauthorized,
    isRecovering,
    canStart,
    start,
  } = useApiReachable();
  const { lists } = useGetAllLists(apiReachable);
  const { tags } = useGetAllTags(apiReachable);

  const [content, setContent] = useCachedState<string>(NOTE_DRAFT_KEY, "");
  const [selectedList, setSelectedList] = useState<string>("");
  const [contentError, setContentError] = useState<string | undefined>();

  const {
    selectedTagIds,
    newTagItems,
    pendingInput,
    onTagIdsChange,
    onPendingInputChange,
    commitPendingTag,
    buildTagsToAttach,
    reset,
  } = useTagPicker({ tags });

  const onContentChange = (text: string) => {
    setContent(text);

    if (text.length > MAX_NOTE_LENGTH) {
      setContentError(t("bookmark.contentTooLong"));
    } else {
      setContentError(undefined);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!values.content || values.content.length === 0) {
      setContentError(t("bookmark.contentRequired"));
      return;
    }

    if (values.content.length > MAX_NOTE_LENGTH) {
      setContentError(t("bookmark.contentTooLong"));
      return;
    }

    log.info("Submitting note", { contentLength: values.content.length, hasList: Boolean(values.list) });

    // Note text is the most expensive input in the extension to lose — it can't
    // be re-copied from a browser the way a URL can — so check reachability
    // (and start a stopped local container) before writing.
    const recovered = await ensureReachable(values.content);
    if (recovered !== "ok") return;

    try {
      const bookmark = await runWithToast({
        loading: { title: t("note.creating") },
        success: { title: t("note.createSuccess") },
        failure: { title: t("note.createFailed") },
        action: async () => {
          const payload = {
            type: "text",
            text: values.content,
            createdAt: new Date().toISOString(),
          };
          const created = await fetchCreateBookmark(payload);

          if (values.list) {
            await fetchAddBookmarkToList(values.list, created.id);
          }

          const tagsToAttach = buildTagsToAttach();
          if (tagsToAttach.length > 0) {
            await fetchAttachTagsToBookmark(created.id, tagsToAttach);
          }

          return created;
        },
      });

      if (!bookmark) return;

      log.info("Note created", { bookmarkId: bookmark.id });
      setContent("");
      reset();
      push(<BookmarkDetail bookmark={bookmark} />);
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      log.error("Failed to create note", { contentLength: values.content.length, error });
    }
  };

  const contentLength = content?.length || 0;

  return (
    <Form
      navigationTitle={`${contentLength} of ${MAX_NOTE_LENGTH}`}
      isLoading={reachability === "checking"}
      actions={
        <ActionPanel>
          {/* First = bound to ↵ while offline; see OfflineFormNotice. */}
          <OpenSettingsAction unauthorized={unauthorized} />
          <StartKarakeepAction offline={offline} canStart={canStart} isRecovering={isRecovering} onStart={start} />
          <Action.SubmitForm title={t("note.create")} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <OfflineFormNotice offline={offline} canStart={canStart} unauthorized={unauthorized} />

      <Form.TextArea
        id="content"
        title={t("bookmark.content")}
        placeholder={t("bookmark.contentPlaceholder")}
        value={content}
        error={contentError}
        onChange={onContentChange}
        onBlur={(event) => {
          if (event.target.value && event.target.value.length > MAX_NOTE_LENGTH) {
            setContentError(t("bookmark.contentTooLong"));
          } else {
            setContentError(undefined);
          }
        }}
      />

      <Form.Dropdown id="list" title={t("bookmark.list")} value={selectedList} onChange={setSelectedList}>
        <Form.Dropdown.Item value="" title={t("bookmark.defaultListPlaceholder")} />
        {lists.map((list) => (
          <Form.Dropdown.Item key={list.id} value={list.id} title={list.name} />
        ))}
      </Form.Dropdown>

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
