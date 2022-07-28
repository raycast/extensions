import url from "url";
import { Note } from "@hackmd/api/dist/type";
import { Action, ActionPanel, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";

import api from "../lib/api";
import { getPreferences } from "../lib/preference";

const { instance_url } = getPreferences();

export default function NoteActions({
  note,
  mutate,
  onDeleteCallback,
}: {
  note?: Note;
  mutate?: () => void;
  onDeleteCallback?: () => void;
}) {
  if (!note) return null;

  const namePath = note.userPath || note.teamPath;
  const noteUrl = new url.URL(`@${namePath}/${note.permalink || note.id}`, instance_url).toString();

  return (
    <>
      <Action.OpenInBrowser title="Open in Browser" url={noteUrl} />
      <Action.CopyToClipboard title="Copy Note Link" content={noteUrl} />

      <ActionPanel.Section>
        <Action
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          title="Delete"
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

                    if (mutate) {
                      mutate();
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
    </>
  );
}
