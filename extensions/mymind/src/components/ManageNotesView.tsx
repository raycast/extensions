import { Action, ActionPanel, Alert, Form, Icon, Keyboard, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { addNoteToObject, deleteNote, MyMindObject, ObjectNote, updateNote } from "../api";

function noteToMarkdown(note: ObjectNote): string {
  if (note.content == null) return "";
  if (typeof note.content === "string") return note.content;
  if (typeof note.content === "object") {
    const body = (note.content as { body?: unknown }).body;
    if (typeof body === "string") return body;
  }
  return "";
}

function NoteForm({
  objectId,
  note,
  onSaved,
}: {
  objectId: string;
  note?: ObjectNote;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const initial = note ? noteToMarkdown(note) : "";
  const [draft, setDraft] = useState(initial);

  const handleSubmit = async ({ markdown }: { markdown: string }) => {
    const trimmed = markdown.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Note is empty" });
      return;
    }
    setSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: note ? "Updating…" : "Adding…" });
    try {
      if (note) await updateNote(objectId, note.id, trimmed);
      else await addNoteToObject(objectId, trimmed);
      toast.style = Toast.Style.Success;
      toast.title = note ? "Note updated" : "Note added";
      onSaved();
      pop();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: note ? "Failed to update note" : "Failed to add note" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={submitting}
      navigationTitle={note ? "Edit Note" : "Add Note"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={note ? "Save" : "Add"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="markdown"
        title="Note"
        placeholder="Markdown…"
        enableMarkdown
        value={draft}
        onChange={setDraft}
      />
    </Form>
  );
}

export function ManageNotesView({ object, onChange }: { object: MyMindObject; onChange?: () => void }) {
  const notes = object.notes ?? [];

  const handleSaved = () => onChange?.();

  const handleDelete = async (note: ObjectNote) => {
    const proceed = await confirmAlert({
      title: "Delete note",
      message: "This can't be undone via the API.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!proceed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting…" });
    try {
      await deleteNote(object.id, note.id);
      toast.style = Toast.Style.Success;
      toast.title = "Note deleted";
      onChange?.();
    } catch (error) {
      toast.hide();
      await showFailureToast(error, { title: "Failed to delete note" });
    }
  };

  return (
    <List navigationTitle={object.title ? `Notes on “${object.title}”` : "Notes"} isShowingDetail>
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Add Note"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Note"
                icon={Icon.Plus}
                target={<NoteForm objectId={object.id} onSaved={handleSaved} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={`Notes (${notes.length})`}>
        {notes.length === 0 && <List.Item icon={Icon.Document} title="No notes yet" />}
        {notes.map((note) => {
          const md = noteToMarkdown(note);
          const preview = md.replace(/\s+/g, " ").trim().slice(0, 60) || "(empty)";
          return (
            <List.Item
              key={note.id}
              icon={Icon.Document}
              title={preview}
              detail={<List.Item.Detail markdown={md || "_(empty)_"} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Note"
                    icon={Icon.Pencil}
                    target={<NoteForm objectId={object.id} note={note} onSaved={handleSaved} />}
                  />
                  <Action
                    title="Delete Note"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(note)}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
