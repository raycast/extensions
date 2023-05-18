import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  Color
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useSqlNotes } from "./useSql";
import { testPermissionErrorType, PermissionErrorScreen } from "./errors";
import { NoteItem } from "./types";
import { useState } from "react";
import { NoteStoreProto } from "./proto/notestore";

const pako = require("pako");

interface Preferences {
  accounts: boolean;
  folders: boolean;
  modificationDate: boolean;
  tags: boolean;
  openSeparately: boolean;
}

const preferences: Preferences = getPreferenceValues();

export default function Command() {
  const sqlState = useSqlNotes();
  const [failedToOpenMessage, setFailedToOpenMessage] = useState("");

  const escapeStringForAppleScript = (str: string) => str.replace('"', '\\"');

  async function openNote(note: NoteItem, separately = false) {
    try {
      runAppleScript(`tell application "Notes"
          set theNote to note id "${escapeStringForAppleScript(note.id)}"
          set theFolder to container of theNote
          show theFolder
          show theNote${separately ? " with separately" : ""}
          activate
        end tell`).then(
        async () => {
          await closeMainWindow();
        },
        async (message) => {
          setFailedToOpenMessage(message?.toString());
        }
      );
    } catch (error) {
      const parsedError = testPermissionErrorType(error);
      if (parsedError !== "unknown") {
        return <PermissionErrorScreen errorType={parsedError} />;
      } else {
        throw error;
      }
    }
  }

  async function deleteNote(note: NoteItem) {
    try {
      runAppleScript(`tell application "Notes"
        delete note id "${escapeStringForAppleScript(note.id)}"
      end tell`);
    } catch (error) {
      const parsedError = testPermissionErrorType(error);
      if (parsedError !== "unknown") {
        return <PermissionErrorScreen errorType={parsedError} />;
      } else {
        throw error;
      }
    }
  }

  async function restoreNote(note: NoteItem) {
    try {
      runAppleScript(`tell application "Notes"
        set theNote to note id "${escapeStringForAppleScript(note.id)}"
        set theFolder to default folder of account 1
        move theNote to theFolder
      end tell`);
    } catch (error) {
      const parsedError = testPermissionErrorType(error);
      if (parsedError !== "unknown") {
        return <PermissionErrorScreen errorType={parsedError} />;
      } else {
        throw error;
      }
    }
  }

  if (sqlState.error) {
    if (testPermissionErrorType(sqlState.error) === "fullDiskAccess") {
      return <PermissionErrorScreen errorType={"fullDiskAccess"} />;
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
    .filter((x) => {
      const found = alreadyFound[x.id];
      if (!found) {
        alreadyFound[x.id] = true;
      }
      return !found;
    })
    .sort((a, b) => (a.modifiedAt && b.modifiedAt && a.modifiedAt < b.modifiedAt ? 1 : -1));

  notes.forEach((note) => {
    if (note.zippedNoteBody) {
      // unzip the note body
      let unzipped = pako.ungzip(note.zippedNoteBody);
      // decode the unzipped protobuf
      const noteBody = NoteStoreProto.decode(unzipped);
      note.noteBody = noteBody?.document?.note?.noteText || "";
    }
    if (note.tags) {
      // tags come from the db as a string, so we need to split them into an array
      let tagString = note.tags as unknown as string;
      note.tags = tagString.split(" ");
    }
  });

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
        <List isLoading={sqlState.isLoading} searchBarPlaceholder="Search notes...">
          {notes
            .filter((a) => a.folder != "Recently Deleted")
            .map((note) => (
              <List.Item
                key={note.id}
                icon="notes-icon.png"
                title={note.title || ""}
                subtitle={note.snippet}
                keywords={[`${note.folder}`, `${note.account}`]
                  .concat(note.noteBody ? [note.noteBody.replace(/\n/g, "")] : [])
                  .concat(note.ocrText ? [note.ocrText.replace(/\n/g, "")] : [])}
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
                  ).concat(
                    preferences.tags && note.tags
                    ? [{ tag: { value: `${note.tags || ""}`, color: Color.Yellow }, tooltip: "Tags" }]
                    : []
                )}
                actions={
                  <ActionPanel title="Actions">
                    {preferences.openSeparately || (
                      <Action
                        title="Open in Notes"
                        icon={Icon.Document}
                        onAction={() => {
                          openNote(note, false);
                        }}
                      />
                    )}
                    <Action
                      title="Open in a Separate Window"
                      icon={Icon.Document}
                      onAction={() => openNote(note, true)}
                    />
                    <Action
                      title="Delete Note"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        if (
                          await confirmAlert({
                            title: "Delete Note",
                            message: "Are you sure?",
                            primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                          })
                        ) {
                          deleteNote(note);
                        }
                      }}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                    />
                    <ActionPanel.Section title="Copy Actions">
                      <Action.CopyToClipboard
                        title="Copy Note URL"
                        icon={Icon.Link}
                        content={`notes://showNote?identifier=${note.UUID}`}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Mobile Note URL"
                        icon={Icon.Link}
                        content={`mobilenotes://showNote?identifier=${note.UUID}`}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}

          <List.Section title="Recently Deleted">
            {notes
              .filter((a) => a.folder == "Recently Deleted")
              .map((note) => (
                <List.Item
                  key={note.id}
                  icon={{ source: Icon.Trash, tintColor: "#777777" }}
                  title={note.title || ""}
                  subtitle={note.snippet}
                  keywords={[`${note.folder}`, `${note.account}`]
                    .concat(note.noteBody ? [note.noteBody.replace(/\n/g, "")] : [])
                    .concat(note.ocrText ? [note.ocrText.replace(/\n/g, "")] : [])}
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
                    )
                    .concat(
                        preferences.tags && note.tags
                        ? [{ tag: { value: `${note.tags || ""}`, color: Color.Yellow }, tooltip: "Tags" }]
                        : []
                    )}
                  actions={
                    <ActionPanel title="Actions">
                      {preferences.openSeparately || (
                        <Action
                          title="Open in Notes"
                          icon={Icon.Document}
                          onAction={() => {
                            openNote(note, false);
                          }}
                        />
                      )}
                      <Action
                        title="Open in a Separate Window"
                        icon={Icon.Document}
                        onAction={() => openNote(note, true)}
                      />
                      <Action
                        title="Restore To Notes Folder"
                        icon={Icon.ArrowCounterClockwise}
                        onAction={() => {
                          restoreNote(note);
                        }}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        </List>
      )}
    </>
  );
}
