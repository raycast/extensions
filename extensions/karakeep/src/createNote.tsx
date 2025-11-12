import { Action, ActionPanel, Form, showToast, Toast, useNavigation, closeMainWindow, showHUD } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchAddBookmarkToList, fetchCreateBookmark } from "./apis";
import { BookmarkDetail } from "./components/BookmarkDetail";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useTranslation } from "./hooks/useTranslation";
import { Bookmark } from "./types";

interface FormValues {
  content: string;
  list?: string;
}

const MAX_NOTE_LENGTH = 2500;
const NOTE_DRAFT_KEY = "create-note-draft";

export default function CreateNoteView() {
  const { push } = useNavigation();
  const { t } = useTranslation();
  const { lists } = useGetAllLists();
  const [content, setContent] = useCachedState<string>(NOTE_DRAFT_KEY, "");
  const [selectedList, setSelectedList] = useState<string>("");
  const [contentError, setContentError] = useState<string | undefined>();

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

    const toast = await showToast({
      title: t("bookmark.creating"),
      style: Toast.Style.Animated,
    });

    try {
      const payload = {
        type: "text",
        text: values.content,
        createdAt: new Date().toISOString(),
      };
      const bookmark = (await fetchCreateBookmark(payload)) as Bookmark;

      if (values.list) {
        if (bookmark) {
          await fetchAddBookmarkToList(values.list, bookmark?.id);
        }
      }

      // Clear the draft after successful creation
      setContent("");

      push(<BookmarkDetail bookmark={bookmark as Bookmark} />);

      toast.style = Toast.Style.Success;
      toast.title = t("bookmark.createSuccess");

      showHUD(t("bookmark.createSuccess"));
      await closeMainWindow({ clearRootSearch: true });
    } catch (error) {
      logger.error("Failed to create note", { contentLength: values.content.length, error });
      toast.style = Toast.Style.Failure;
      toast.title = t("bookmark.createFailed");
      toast.message = String(error);
    }
  };

  const contentLength = content?.length || 0;

  return (
    <Form
      navigationTitle={`${contentLength} of ${MAX_NOTE_LENGTH}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("bookmark.create")} onSubmit={onSubmit} />
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
    </Form>
  );
}
