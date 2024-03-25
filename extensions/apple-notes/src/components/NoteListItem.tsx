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
  closeMainWindow,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NoteItem, useNotes } from "../useNotes";
import { deleteNoteById, restoreNoteById, openNoteSeparately } from "../api";

const preferences = getPreferenceValues<Preferences>();

type NoteListItemProps = {
  note: NoteItem;
  isDeleted?: boolean;
  mutate: ReturnType<typeof useNotes>["mutate"];
};

export default function NoteListItem({ note, isDeleted, mutate }: NoteListItemProps) {
  console.log(note);
  async function openNoteInSeparateWindow() {
    try {
      await openNoteSeparately(note.id);
      await closeMainWindow();
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
        await deleteNoteById(note.id);
        await mutate();
        await showToast({ title: "Deleted note", message: `"${note.title}" has been deleted` });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete note" });
    }
  }

  async function restoreNote() {
    try {
      await restoreNoteById(note.id);
      await mutate();
      await showToast({ title: "Restored note", message: `"${note.title}" has been restored` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not restore note" });
    }
  }

  const accessories = [];

  if (preferences.locked && note.locked) {
    accessories.push({
      icon: Icon.Lock,
      tooltip: "Password-protected note",
    });
  }

  if (preferences.checklist && note.checklist) {
    accessories.push({
      icon: note.checklistInProgress ? Icon.Circle : Icon.CheckCircle,
      tooltip: note.checklistInProgress ? "Checklist in progress" : "Checklist completed",
    });
  }

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

  const openInNotesAction = (
    <Action.Open
      title="Open in Notes"
      target={`notes://showNote?identifier=${note.UUID}`}
      icon={Icon.Document}
      application="com.apple.notes"
    />
  );

  const openInSeparateWindowAction = (
    <Action title="Open in a Separate Window" icon={Icon.NewDocument} onAction={openNoteInSeparateWindow} />
  );

  const keywords = [];
  if (note.folder) {
    keywords.push(...note.folder.split(" "));
  }

  if (note.account) {
    keywords.push(...note.account.split(" "));
  }

  if (note.snippet) {
    keywords.push(...note.snippet.split(" "));
  }

  if (note.checklist) {
    keywords.push(...["checklist", "todo", "task", "to-do"]);
    keywords.push(...(note.checklistInProgress ? ["progress", "active"] : ["done", "completed"]));
  }

  if (note.locked) {
    keywords.push("locked");
  }

  return (
    <List.Item
      key={note.id}
      icon={isDeleted ? { source: Icon.Trash, tintColor: Color.SecondaryText } : "notes-icon.png"}
      title={note.title || ""}
      subtitle={note.snippet}
      keywords={keywords}
      accessories={accessories}
      actions={
        <ActionPanel>
          {isDeleted ? (
            openInNotesAction
          ) : preferences.openSeparately ? (
            <>
              {openInSeparateWindowAction}
              {openInNotesAction}
            </>
          ) : (
            <>
              {openInNotesAction}
              {openInSeparateWindowAction}
            </>
          )}

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
                await mutate();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Refreshed notes",
                  message: "If you don't see your updates, please close and reopen the command.",
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
