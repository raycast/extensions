import { ActionPanel, List, Action, closeMainWindow, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useSqlNotes } from "./useSql";
import { useAppleScriptNotes } from "./useAppleScript";
import { isPermissionError, PermissionErrorScreen } from "./errors";
import { NoteItem } from "./types";

interface Preferences {
  accounts: boolean;
  folders: boolean;
  modificationDate: boolean;
}

const preferences: Preferences = getPreferenceValues();

export default function Command() {
  const sqlState = useSqlNotes();
  const appleScriptState = useAppleScriptNotes(preferences.modificationDate);

  async function openNote(note: NoteItem) {
    await closeMainWindow();
    await runAppleScript(`tell application "Notes" \nshow note "${note.title}" \nend tell`);
  }

  if (sqlState.error) {
    if (isPermissionError(sqlState.error)) {
      return <PermissionErrorScreen />;
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Cannot search notes",
        message: sqlState.error.message,
      });
    }
  }

  const alreadyFound: { [key: string]: boolean } = {};
  const notes = (sqlState.results || [])
    .concat(appleScriptState.notes || [])
    .filter((x) => {
      const found = alreadyFound[x.id];
      if (!found) {
        alreadyFound[x.id] = true;
      }
      return !found;
    })
    .sort((a, b) => (a.modifiedAt && b.modifiedAt && a.modifiedAt < b.modifiedAt ? 1 : -1));

  return (
    <List isLoading={sqlState.isLoading || appleScriptState.isLoading}>
      {notes.map((note) => (
        <List.Item
          key={note.id}
          icon="notes-icon.png"
          title={note.title || ""}
          subtitle={note.snippet}
          keywords={[`${note.folder}`, `${note.account}`, note.snippet]}
          accessories={([] as List.Item.Accessory[])
            .concat(
              preferences.accounts
                ? preferences.folders
                  ? [{ text: `${note.account} -> ${note.folder}`, tooltip: "Account -> Folder" }]
                  : [{ text: `${note.account}`, tooltip: "Account" }]
                : preferences.folders
                ? [{ text: `${note.folder}`, tooltip: "Folder" }]
                : []
            )
            .concat(
              preferences.modificationDate
                ? [
                    {
                      date: new Date(note.modifiedAt || ""),
                      tooltip: "Last Modified At",
                    },
                  ]
                : []
            )}
          actions={
            <ActionPanel title="Actions">
              <Action title="Open in Notes" icon={Icon.TextDocument} onAction={() => openNote(note)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
