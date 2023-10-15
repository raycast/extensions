import {
  Action,
  ActionPanel,
  closeMainWindow,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useSqlNotes } from "./useSql";
import { useAppleScriptNotes } from "./useAppleScript";
import { isPermissionError, PermissionErrorScreen } from "./errors";
import { NoteItem } from "./types";
import { useState } from "react";
import { Clipboard } from "@raycast/api";

interface Preferences {
  accounts: boolean;
  folders: boolean;
  modificationDate: boolean;
}

const preferences: Preferences = getPreferenceValues();

export default function Command() {
  const sqlState = useSqlNotes();
  const appleScriptState = useAppleScriptNotes(preferences.modificationDate);
  const [failedToOpenMessage, setFailedToOpenMessage] = useState("");

  const escapeStringForAppleScript = (str: string) => str.replace('"', '\\"');

  async function openNote(note: NoteItem) {
    runAppleScript(`tell application "Notes" \nshow note "${escapeStringForAppleScript(note.title)}" \nend tell`).then(
      async () => {
        await closeMainWindow();
      },
      async (message) => {
        setFailedToOpenMessage(message?.toString());
      }
    );
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
    <>
      {failedToOpenMessage && (
        <>
          <Detail
            navigationTitle="Failure"
            markdown={`### Failed to open the note with error:\n ${failedToOpenMessage}`}
            actions={
              <ActionPanel title="Failure Actions">
                <Action.OpenInBrowser
                  title={"Submit bug report"}
                  url="https://github.com/raycast/extensions/issues/new?template=extension_bug_report.yml&title=%5BApple%20Notes%5D+...&extension-url=https%3A%2F%2Fraycast.com%2Ftumtum%2Fapple-notes"
                />
                <Action.CopyToClipboard title="Copy Error Message" content={failedToOpenMessage} />
              </ActionPanel>
            }
          />
        </>
      )}

      {!failedToOpenMessage && (
        <List isLoading={sqlState.isLoading || appleScriptState.isLoading}>
          {notes.map((note) => (
            <List.Item
              key={note.id}
              icon="notes-icon.png"
              title={note.title || ""}
              subtitle={note.snippet}
              keywords={[`${note.folder}`, `${note.account}`].concat(note.snippet ? [note.snippet] : [])}
              accessories={([] as List.Item.Accessory[])
                .concat(
                  preferences.accounts
                    ? preferences.folders
                      ? [
                          {
                            text: `${note.account || ""} -> ${note.folder || ""}`,
                            tooltip: "Account -> Folder",
                          },
                        ]
                      : [{ text: `${note.account || ""}`, tooltip: "Account" }]
                    : preferences.folders
                    ? [{ text: `${note.folder || ""}`, tooltip: "Folder" }]
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
      )}
    </>
  );
}
