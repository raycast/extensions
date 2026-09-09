import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { appendNote, createNote } from "../lib/api";
import { Note } from "../lib/api-core";

export function NoteForm({ note, folder, onSaved }: { note?: Note; folder?: string; onSaved?: () => void }) {
  const { pop } = useNavigation();
  const [busy, setBusy] = useState(false);
  const [titleError, setTitleError] = useState<string>();
  const [contentError, setContentError] = useState<string>();
  async function submit(values: { title?: string; content: string; folder?: string }) {
    if (busy) return;
    if (!note && !values.title?.trim()) {
      setTitleError("Enter a title");
      return;
    }
    if (!values.content.trim()) {
      setContentError("Enter content");
      return;
    }
    setBusy(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: note ? "Appending content…" : "Creating note…",
    });
    try {
      if (note) await appendNote(note.id, values.content);
      else await createNote(values.title!, values.content, values.folder?.trim() || undefined);
      toast.style = Toast.Style.Success;
      toast.title = note ? "Content appended" : "Note created";
      onSaved?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not save note";
      toast.message = error instanceof Error ? error.message : "Check connection settings.";
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      navigationTitle={note ? "Append to Note" : "Create Note"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={note ? "Append Content" : "Create Note"} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {note ? (
        <Form.Description
          title="Note"
          text={`${note.title} — new content is appended, not replaced. Writes are never automatically retried.`}
        />
      ) : (
        <Form.TextField id="title" title="Title" error={titleError} onChange={() => setTitleError(undefined)} />
      )}
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="Text, Markdown, or HTML"
        error={contentError}
        onChange={() => setContentError(undefined)}
      />
      {!note && (
        <Form.TextField
          id="folder"
          title="Folder ID"
          defaultValue={folder}
          placeholder="Optional — copy an ID from Browse Folders"
        />
      )}
    </Form>
  );
}
