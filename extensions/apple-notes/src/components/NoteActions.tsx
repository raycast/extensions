import {
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
  useNavigation,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NoteItem, useNotes } from "../useNotes";
import { deleteNoteById, restoreNoteById, openNoteSeparately } from "../api";
import NoteDetail from "./NoteDetail";

const preferences = getPreferenceValues<Preferences>();

type NoteActionsProps = {
  note: NoteItem;
  mutate: ReturnType<typeof useNotes>["mutate"];
  isDeleted?: boolean;
  isDetail?: boolean;
};

export default function NoteActions({ note, isDeleted, isDetail, mutate }: NoteActionsProps) {
  const { pop } = useNavigation();

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
        if (isDetail) {
          await pop();
        }
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
      if (isDetail) {
        await pop();
      }
      await showToast({ title: "Restored note", message: `"${note.title}" has been restored` });
    } catch (error) {
      await showFailureToast(error, { title: "Could not restore note" });
    }
  }

  const getOpenNotesAction = (separately?: boolean, shortcut?: Keyboard.Shortcut) =>
    separately ? (
      <Action
        title="Open in a Separate Window"
        icon={Icon.NewDocument}
        onAction={openNoteInSeparateWindow}
        shortcut={shortcut}
      />
    ) : (
      <Action.Open
        title="Open in Notes"
        target={`notes://showNote?identifier=${note.UUID}`}
        icon={{ fileIcon: "/System/Applications/Notes.app" }}
        application="com.apple.notes"
        shortcut={shortcut}
      />
    );

  const primaryOpen = isDeleted ? getOpenNotesAction() : getOpenNotesAction(preferences.openSeparately);
  const secondaryOpen = isDeleted
    ? null
    : getOpenNotesAction(!preferences.openSeparately, Keyboard.Shortcut.Common.Open);

  return (
    <ActionPanel>
      {primaryOpen}
      <Action.Push
        title="View Note"
        icon={Icon.Eye}
        target={<NoteDetail note={note} isDeleted={isDeleted} mutate={mutate} />}
      />
      {secondaryOpen}

      {isDeleted ? (
        <Action
          title="Restore to Notes Folder"
          icon={Icon.ArrowCounterClockwise}
          onAction={restoreNote}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        />
      ) : (
        <Action
          title="Delete Note"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={deleteNote}
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
        {note.invitationLink ? (
          <Action.CopyToClipboard
            title="Copy Invitation Link"
            icon={Icon.Link}
            content={note.invitationLink}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        ) : null}
      </ActionPanel.Section>

      {!isDetail ? (
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
      ) : null}
    </ActionPanel>
  );
}
