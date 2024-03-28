import {
  Icon,
  getPreferenceValues,
  ActionPanel,
  Action,
  confirmAlert,
  Color,
  Keyboard,
  Clipboard,
  showToast,
  Toast,
  closeMainWindow,
  useNavigation,
  showHUD,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { NoteItem, useNotes } from "../useNotes";
import { deleteNoteById, restoreNoteById, openNoteSeparately, getNotePlainText, getNoteBody } from "../api";
import NoteDetail from "./NoteDetail";
import { fileIcon } from "../helpers";
import { NodeHtmlMarkdown } from "node-html-markdown";

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

  async function copyNoteContent(getContent: (noteId: string) => Promise<string>) {
    try {
      await closeMainWindow();
      const content = await getContent(note.id);
      await Clipboard.copy(content);
      await showHUD("Copied to Clipboard");
    } catch (error) {
      await showFailureToast(error, { title: "Could not copy note content" });
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
        icon={{ fileIcon }}
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
          content={{
            html: `<a href="notes://showNote?identifier=${note.UUID}" title="${note.title}">${note.title}</a>`,
            text: `notes://showNote?identifier=${note.UUID}`,
          }}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />

        <Action.CopyToClipboard
          title="Copy Mobile Note URL"
          content={{
            html: `<a href="mobilenotes://showNote?identifier=${note.UUID}" title="${note.title}">${note.title}</a>`,
            text: `mobilenotes://showNote?identifier=${note.UUID}`,
          }}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
        {note.invitationLink ? (
          <Action.CopyToClipboard
            title="Copy Invitation Link"
            content={note.invitationLink}
            shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
          />
        ) : null}

        <Action.CopyToClipboard
          title="Copy Note Title"
          content={note.title}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />

        <ActionPanel.Submenu
          title="Copy Note Content As"
          icon={Icon.Clipboard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        >
          <Action
            title="Plain Text"
            onAction={() => copyNoteContent(getNotePlainText)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
          <Action
            title="HTML"
            onAction={() => copyNoteContent(getNoteBody)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
          />
          <Action
            title="Markdown"
            onAction={async () =>
              copyNoteContent(async (noteId) => {
                const content = await getNoteBody(noteId);
                const nodeToMarkdown = new NodeHtmlMarkdown();
                return nodeToMarkdown.translate(content);
              })
            }
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        </ActionPanel.Submenu>
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
