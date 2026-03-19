import { Action, ActionPanel, Form, useNavigation, closeMainWindow } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useRef, useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAddBookmarkToList, fetchAttachTagsToBookmark, fetchCreateBookmark } from "./apis";
import { BookmarkDetail } from "./components/BookmarkDetail";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useGetAllTags } from "./hooks/useGetAllTags";
import { useTranslation } from "./hooks/useTranslation";
import { runWithToast } from "./utils/toast";

const log = logger.child("[CreateNote]");

interface FormValues {
  content: string;
  list?: string;
}

const MAX_NOTE_LENGTH = 2500;
const NOTE_DRAFT_KEY = "create-note-draft";

// Prefix used to distinguish user-typed new tags from existing tag IDs
const NEW_TAG_PREFIX = "new:";

export default function CreateNoteView() {
  const { push } = useNavigation();
  const { t } = useTranslation();
  const { lists } = useGetAllLists();
  const { tags } = useGetAllTags();
  const [content, setContent] = useCachedState<string>(NOTE_DRAFT_KEY, "");
  const [selectedList, setSelectedList] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [contentError, setContentError] = useState<string | undefined>();

  // User-typed new tag names that have been committed as pills
  const [newTagItems, setNewTagItems] = useState<Array<{ id: string; name: string }>>([]);
  // Text the user is currently typing in the new tag field
  const [pendingInput, setPendingInput] = useState("");
  // Ref to keep selectedTagIds in sync inside callbacks without stale closure
  const selectedTagIdsRef = useRef<string[]>([]);

  const onContentChange = (text: string) => {
    setContent(text);

    if (text.length > MAX_NOTE_LENGTH) {
      setContentError(t("bookmark.contentTooLong"));
    } else {
      setContentError(undefined);
    }
  };

  function commitNewTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;
    if (newTagItems.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;

    const id = `${NEW_TAG_PREFIX}${trimmed}`;
    setNewTagItems((prev) => [...prev, { id, name: trimmed }]);
    const next = [...selectedTagIdsRef.current, id];
    selectedTagIdsRef.current = next;
    setSelectedTagIds(next);
  }

  function onPendingInputChange(text: string) {
    if (text.includes(",")) {
      const parts = text.split(",");
      parts.slice(0, -1).forEach((p) => commitNewTag(p));
      setPendingInput(parts[parts.length - 1]);
    } else {
      setPendingInput(text);
    }
  }

  function onTagIdsChange(value: string[]) {
    selectedTagIdsRef.current = value;
    setSelectedTagIds(value);
    setNewTagItems((prev) => prev.filter((item) => value.includes(item.id)));
  }

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

          const tagsToAttach: Array<{ tagId?: string; tagName?: string; attachedBy: "human" }> = [];
          for (const v of selectedTagIds) {
            if (v.startsWith(NEW_TAG_PREFIX)) {
              tagsToAttach.push({ tagName: v.slice(NEW_TAG_PREFIX.length), attachedBy: "human" });
            } else {
              tagsToAttach.push({ tagId: v, attachedBy: "human" });
            }
          }
          if (tagsToAttach.length > 0) {
            await fetchAttachTagsToBookmark(created.id, tagsToAttach);
          }

          return created;
        },
      });

      if (!bookmark) return;

      log.info("Note created", { bookmarkId: bookmark.id });
      setContent("");
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
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("note.create")} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
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
        onBlur={() => {
          if (pendingInput.trim()) {
            commitNewTag(pendingInput);
            setPendingInput("");
          }
        }}
      />
    </Form>
  );
}
