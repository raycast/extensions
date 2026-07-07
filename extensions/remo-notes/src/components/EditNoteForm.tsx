import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { Folder, Note } from "../types";
import { remoApi } from "../utils/api";
import { handleError } from "../utils/errors";

interface EditNoteFormProps {
  note: Note;
  folders: Folder[];
  onSaved: () => void;
}

interface EditNoteValues {
  title: string;
  tags: string;
  folderId: string;
}

export function EditNoteForm({ note, folders, onSaved }: EditNoteFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: EditNoteValues) {
    setIsLoading(true);
    try {
      const tags = values.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      await remoApi.updateNote(note._id, {
        title: values.title.trim() || "Untitled",
        tags,
        folderId: values.folderId === "" ? null : values.folderId,
      });

      showToast({ style: Toast.Style.Success, title: "Note updated" });
      onSaved();
      pop();
    } catch (error) {
      handleError(error, "Failed to update note");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Edit Note"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={note.title} />
      <Form.TextField id="tags" title="Tags" placeholder="comma, separated" defaultValue={note.tags.join(", ")} />
      <Form.Dropdown id="folderId" title="Folder" defaultValue={note.folderId ?? ""}>
        <Form.Dropdown.Item value="" title="No folder (Inbox)" icon={Icon.Tray} />
        {folders.map((folder) => (
          <Form.Dropdown.Item key={folder._id} value={folder._id} title={folder.name} icon={Icon.Folder} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
