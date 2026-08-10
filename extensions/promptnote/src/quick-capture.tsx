import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import { AuthWrapper, useLogout } from "./components/AuthWrapper";
import { useNotes, createNote } from "./lib/hooks/useNotes";
import { createSnippet } from "./lib/hooks/useSnippets";

function QuickCaptureContent() {
  const { data: notes, isLoading: notesLoading } = useNotes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleLogout = useLogout();

  const handleSubmit = async (values: {
    content: string;
    noteId: string;
    newNoteTitle?: string;
  }) => {
    if (!values.content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Content is required",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let noteId = values.noteId;

      // Create new note if "new" is selected
      if (noteId === "new") {
        const newNote = await createNote(values.newNoteTitle?.trim() || "", []);
        noteId = newNote.id;
      }

      // Create the snippet
      await createSnippet(noteId, values.content.trim(), "");

      await showToast({
        style: Toast.Style.Success,
        title: "Snippet captured",
      });

      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to capture snippet",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort notes by most recently updated
  const sortedNotes = (notes || []).sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return (
    <Form
      isLoading={notesLoading || isSubmitting}
      navigationTitle="Quick Capture"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Snippet"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
          <ActionPanel.Section>
            <Action title="Logout" icon={Icon.Logout} onAction={handleLogout} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Paste or type your prompt..."
        enableMarkdown
        autoFocus
      />

      <Form.Separator />

      <Form.Dropdown id="noteId" title="Save To" defaultValue="new">
        <Form.Dropdown.Item
          value="new"
          title="Create New Note"
          icon={Icon.Plus}
        />
        <Form.Dropdown.Section title="Existing Notes">
          {sortedNotes.map((note) => (
            <Form.Dropdown.Item
              key={note.id}
              value={note.id}
              title={note.title}
              icon={note.pinned ? Icon.Pin : Icon.Document}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      <Form.TextField
        id="newNoteTitle"
        title="New Note Title"
        placeholder="Title for new note (optional)"
        info="Only used when creating a new note"
      />
    </Form>
  );
}

export default function Command() {
  return (
    <AuthWrapper>
      <QuickCaptureContent />
    </AuthWrapper>
  );
}
