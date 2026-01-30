import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getNotes, deleteNote } from "./storage";
import { Note } from "./types";
import NoteForm from "./new-note";

interface ViewNotesContext {
  selectedNoteId?: string;
}

function NoteDetail({ note, onRefresh }: { note: Note; onRefresh: () => void }) {
  async function handleDelete() {
    if (
      await confirmAlert({
        title: "Delete Note",
        message: `Are you sure you want to delete "${note.title}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      await deleteNote(note.id);
      await showToast({ style: Toast.Style.Success, title: "Note deleted" });
      onRefresh();
    }
  }

  return (
    <Detail
      navigationTitle={note.title}
      markdown={note.body || "*No content*"}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Created" text={new Date(note.createdAt).toLocaleString()} />
          <Detail.Metadata.Label title="Updated" text={new Date(note.updatedAt).toLocaleString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push title="Edit Note" icon={Icon.Pencil} target={<NoteForm note={note} onSave={onRefresh} />} />
          <Action.CopyToClipboard title="Copy Markdown" content={note.body} />
          <Action
            title="Delete Note"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={handleDelete}
          />
        </ActionPanel>
      }
    />
  );
}

export default function ViewNotes(props: LaunchProps<{ launchContext?: ViewNotesContext }>) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const selectedNoteId = props.launchContext?.selectedNoteId;

  async function refresh() {
    setIsLoading(true);
    setNotes(await getNotes());
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search notes..." selectedItemId={selectedNoteId}>
      {notes.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Notes Yet"
          description="Create your first note with the 'New Note' command."
          icon={Icon.Document}
        />
      ) : (
        notes.map((note) => (
          <List.Item
            key={note.id}
            title={note.title}
            subtitle={new Date(note.updatedAt).toLocaleDateString()}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Note"
                  icon={Icon.Eye}
                  target={<NoteDetail note={note} onRefresh={refresh} />}
                />
                <Action.Push
                  title="Edit Note"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<NoteForm note={note} onSave={refresh} />}
                />
                <Action.Push
                  title="Create New Note"
                  icon={Icon.PlusCircle}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<NoteForm onSave={refresh} />}
                />
                <Action.CopyToClipboard
                  title="Copy Markdown"
                  content={note.body}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
