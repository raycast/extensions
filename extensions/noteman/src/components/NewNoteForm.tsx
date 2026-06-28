import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { getNotesDirectory } from "../lib/config";
import { createNewNoteFile } from "../lib/notes";
import { NoteDetailView } from "./NoteDetailView";

type NewNoteFormProps = {
  onCreated?: (path: string) => void;
  initialTitle?: string;
  initialContent?: string;
};

export function NewNoteForm({
  onCreated,
  initialTitle = "",
  initialContent = "",
}: NewNoteFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const { push } = useNavigation();

  async function handleSubmit() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title is required",
      });
      return;
    }

    try {
      const notesDir = getNotesDirectory();
      const createdPath = await createNewNoteFile(
        notesDir,
        cleanTitle,
        content,
      );

      onCreated?.(createdPath);
      await showToast({ style: Toast.Style.Success, title: "Note created" });
      push(
        <NoteDetailView
          notePath={createdPath}
          onNoteChanged={onCreated}
          onNoteDeleted={onCreated}
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create note",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="New Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Note"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Project Ideas"
        value={title}
        onChange={setTitle}
      />
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Start writing..."
        value={content}
        onChange={setContent}
      />
    </Form>
  );
}
