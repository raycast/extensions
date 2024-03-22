import {
  List,
  Icon,
  getPreferenceValues,
  ActionPanel,
  Action,
  confirmAlert,
  Color,
  Keyboard,
  showToast,
  Toast,
} from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { NoteItem, useNotes } from "../useNotes";
import { escapeDoubleQuotes } from "../utils";

const preferences = getPreferenceValues<Preferences>();

type NoteListItemProps = {
  note: NoteItem;
  isDeleted?: boolean;
  mutate: ReturnType<typeof useNotes>["mutate"];
};

export default function NoteListItem({ note, isDeleted, mutate }: NoteListItemProps) {
  async function openNote({ separately }: { separately?: boolean } = {}) {
    try {
      await runAppleScript(`tell application "Notes"
          set theNote to note id "${escapeDoubleQuotes(note.id)}"
          set theFolder to container of theNote
          show theFolder
          show theNote${separately ? " with separately" : ""}
          activate
        end tell`);
    } catch (error) {
      await showFailureToast(error, { title: "Could not open note" });
    }
  }

  async function deleteNote() {
    try {
      if (
        await confirmAlert({
          title: "Delete Note",
          message: "Are you sure you want to delete this note?",
          icon: { source: Icon.Trash, tintColor: Color.Red },
        })
      ) {
        await runAppleScript(`tell application "Notes"
        delete note id "${escapeDoubleQuotes(note.id)}"
        end tell`);
        await mutate();
        await showToast({ title: "Deleted note", message: `"${note.title}" has been deleted` });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete note" });
    }
  }

  async function restoreNote() {
    try {
      await runAppleScript(`tell application "Notes"
        set theNote to note id "${escapeDoubleQuotes(note.id)}"
        set theFolder to default folder of account 1
        move theNote to theFolder
      end tell`);
      await mutate();
      await showToast({ title: "Restored note", message: `"${note.title}" has been restored` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not restore note" });
    }
  }

  const accessories = [];
  if (preferences.accounts && note.account) {
    accessories.push({
      text: preferences.folders ? `${note.account || ""} -> ${note.folder || ""}` : `${note.account || ""}`,
    });
  } else if (preferences.folders) {
    accessories.push({
      text: `${note.folder || ""}`,
      tooltip: "Folder",
    });
  }

  if (preferences.modificationDate && note.modifiedAt) {
    accessories.push({
      date: new Date(note.modifiedAt),
      tooltip: "Last Modified",
    });
  }

  const openInNotesAction = <Action title="Open in Notes" icon={Icon.Document} onAction={() => openNote()} />;

  const openInSeparateWindowAction = (
    <Action title="Open in a Separate Window" icon={Icon.NewDocument} onAction={() => openNote({ separately: true })} />
  );

  return (
    <List.Item
      key={note.id}
      icon={isDeleted ? { source: Icon.Trash, tintColor: Color.SecondaryText } : "notes-icon.png"}
      title={note.title || ""}
      subtitle={note.snippet}
      keywords={[`${note.folder}`, `${note.account}`].concat(note.snippet ? [note.snippet] : [])}
      accessories={accessories}
      actions={
        <ActionPanel>
          {preferences.openSeparately ? openInSeparateWindowAction : openInNotesAction}
          {preferences.openSeparately ? openInNotesAction : openInSeparateWindowAction}

          {isDeleted ? (
            <Action
              title="Restore to Notes Folder"
              icon={Icon.ArrowCounterClockwise}
              onAction={() => restoreNote()}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            />
          ) : (
            <Action
              title="Delete Note"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => deleteNote()}
              shortcut={Keyboard.Shortcut.Common.Remove}
            />
          )}

          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Note URL"
              icon={Icon.Link}
              content={{
                html: `<a href="notes://showNote?identifier=${note.UUID}" title="${note.title}">${note.title}</a>`,
                text: `notes://showNote?identifier=${note.UUID}`,
              }}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Mobile Note URL"
              icon={Icon.Link}
              content={{
                html: `<a href="mobilenotes://showNote?identifier=${note.UUID}" title="${note.title}">${note.title}</a>`,
                text: `mobilenotes://showNote?identifier=${note.UUID}`,
              }}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                await mutate;
                await showToast({
                  style: Toast.Style.Success,
                  title: "Refreshed notes",
                });
              }}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
