import { Action, ActionPanel, Form, showToast, Toast, useNavigation, launchCommand, LaunchType } from "@raycast/api";
import { saveNote } from "./storage";
import { Note } from "./types";

interface NoteFormProps {
  note?: Note;
  onSave?: () => void;
}

export default function NoteForm({ note, onSave }: NoteFormProps = {}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { title: string; body: string }) {
    const now = Date.now();
    const id = note?.id ?? now.toString();
    await saveNote({
      id,
      title: values.title,
      body: values.body,
      createdAt: note?.createdAt ?? now,
      updatedAt: now,
    });
    await showToast({ style: Toast.Style.Success, title: note ? "Note updated" : "Note created" });
    if (onSave) {
      onSave();
      pop();
    } else {
      // Standalone launch — navigate to view-notes with this note selected
      await launchCommand({ name: "view-notes", type: LaunchType.UserInitiated, context: { selectedNoteId: id } });
    }
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title={note ? "Update Note" : "Create Note"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Note title" defaultValue={note?.title ?? ""} />
      <Form.TextArea
        id="body"
        title="Content"
        placeholder="Write your markdown here..."
        defaultValue={note?.body ?? ""}
        enableMarkdown
      />
    </Form>
  );
}
