import { Note } from "@hackmd/api/dist/type";
import { Action, ActionPanel, Icon, confirmAlert, Alert, showToast, Toast, useNavigation } from "@raycast/api";

import api from "../lib/api";
import NoteForm from "./NoteForm";
import { useCachedPromise } from "@raycast/utils";
import { getNoteUrl } from "../helpers/noteHelper";
import CreateNote from "../create-note";

export default function NoteActions({
  note,
  mutate,
  onDeleteCallback,
}: {
  note: Note;
  mutate?: () => void;
  onDeleteCallback?: () => void;
}) {
  const noteUrl = getNoteUrl(note);
  const editUrl = getNoteUrl(note, true);

  const { data: singleNoteData } = useCachedPromise((noteId) => api.getNote(noteId), [note.id]);
  const { pop } = useNavigation();

  return (
    <>
      <Action.OpenInBrowser title="Open in Browser" url={noteUrl} />
      <Action.CopyToClipboard title="Copy Note Link" content={noteUrl} />

      <ActionPanel.Section>
        {singleNoteData && (
          <Action.Push
            icon={Icon.Pencil}
            title="Edit Note"
            shortcut={{
              key: "e",
              modifiers: ["cmd", "shift"],
            }}
            target={
              <NoteForm
                note={singleNoteData}
                onSubmit={async (values) => {
                  const { teamPath, ...rest } = values;

                  try {
                    if (teamPath) {
                      await api.updateTeamNote(teamPath, note.id, rest);
                    } else {
                      await api.updateNote(note.id, rest);
                    }
                  } catch (e) {
                    showToast({
                      title: "Update Note Failed",
                      message: String(e),
                      style: Toast.Style.Failure,
                    });
                  }

                  setTimeout(() => {
                    if (mutate) mutate();
                  }, 200);

                  pop();
                }}
              />
            }
          />
        )}
        <Action.OpenInBrowser
          title="Edit in Browser"
          url={editUrl}
          shortcut={{
            modifiers: ["cmd", "shift"],
            key: "k",
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          title="Delete Note"
          shortcut={{
            key: "d",
            modifiers: ["cmd", "shift"],
          }}
          onAction={async () => {
            confirmAlert({
              title: "Delete Note",
              message: `Are you sure you want to delete ${note.title}?`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
                onAction: async () => {
                  try {
                    if (note.teamPath) {
                      await api.deleteTeamNote(note.teamPath, note.id);
                    } else {
                      await api.deleteNote(note.id);
                    }

                    if (onDeleteCallback) {
                      onDeleteCallback();
                    }
                  } catch (error) {
                    showToast({
                      title: "Error",
                      message: String(error),
                      style: Toast.Style.Failure,
                    });
                  }
                },
              },
            });
          }}
        />
      </ActionPanel.Section>

      <Action.Push
        title="Create Note"
        icon={Icon.Plus}
        target={<CreateNote />}
        shortcut={{
          key: "c",
          modifiers: ["cmd", "shift"],
        }}
      />
    </>
  );
}
