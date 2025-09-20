import { showToast, Toast, popToRoot, Detail, ActionPanel, Action, Icon, confirmAlert } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback } from "react";
import useNoteStore from "../stores/note-store";
import { Note } from "../types";
import { NoteForm } from "./note-form";

export function NoteDetail({ note }: { note: Note }) {
  const { deleteNote } = useNoteStore();
  const onDelete = useCallback(
    async (noteId: string) => {
      try {
        await deleteNote(noteId);
        showToast({
          style: Toast.Style.Success,
          title: "Success!",
          message: "Note deleted",
        });
        popToRoot();
      } catch (err: unknown) {
        showFailureToast(err, {
          title: "Failed to delete note, please check your API key, API endpoint and try again.",
        });
      }
    },
    [deleteNote],
  );
  return (
    <Detail
      markdown={note.content}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Category" text={note.folder?.name || "Uncategorized"} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.Pencil} title="Edit" target={<NoteForm note={note} />} />
          <Action
            icon={Icon.Trash}
            title="Delete"
            onAction={async () => {
              if (await confirmAlert({ title: "Are you sure you want to delete this note?" })) {
                onDelete(note.id);
                showToast({
                  style: Toast.Style.Animated,
                  title: "Deleting the note...",
                });
              } else {
                showToast({
                  style: Toast.Style.Success,
                  title: "Canceled",
                  message: "Note not deleted",
                });
              }
            }}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    />
  );
}
