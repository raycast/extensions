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
  AI,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useState } from "react";

import { NoteTitle } from "..";
import { deleteNoteById, restoreNoteById, openNoteSeparately, getNotePlainText, getNoteBody } from "../api/applescript";
import { fileIcon, getOpenNoteURL } from "../helpers";
import { NoteItem, useNotes } from "../hooks/useNotes";

import AddTextForm from "./AddTextForm";
import NoteDetail from "./NoteDetail";

const preferences = getPreferenceValues<Preferences>();

type NoteActionsProps = {
  note: NoteItem;
  noteTitles?: NoteTitle[];
  mutate: ReturnType<typeof useNotes>["mutate"];
  isDeleted?: boolean;
  isDetail?: boolean;
};

export default function NoteActions({ noteTitles, note, isDeleted, isDetail, mutate }: NoteActionsProps) {
  const { pop } = useNavigation();

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

  const primaryOpen = isDeleted ? (
    <OpenNoteAction note={note} />
  ) : (
    <OpenNoteAction note={note} separately={preferences.openSeparately} />
  );

  const secondaryOpen = isDeleted ? null : (
    <OpenNoteAction note={note} separately={!preferences.openSeparately} shortcut={Keyboard.Shortcut.Common.Open} />
  );

  return (
    <ActionPanel>
      {primaryOpen}
      <Action.Push
        title="View Note"
        icon={Icon.Eye}
        target={<NoteDetail note={note} isDeleted={isDeleted} mutate={mutate} />}
      />
      {secondaryOpen}

      <ActionPanel.Section>
        <Action.Push
          title="Add Text to Note"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
          target={<AddTextForm noteId={note.id} />}
        />

        {note.links.length > 0 ? (
          <ActionPanel.Submenu title="Open Links" icon={Icon.Link} shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}>
            {note.links.map((link) => {
              if (link.url && link.text) {
                return (
                  <Action.Open
                    key={link.id}
                    title={link.text}
                    target={link.url}
                    icon={isDeleted ? { source: Icon.Trash, tintColor: Color.SecondaryText } : "notes-icon.png"}
                  />
                );
              }
            })}
          </ActionPanel.Submenu>
        ) : null}

        {note.backlinks.length > 0 ? (
          <ActionPanel.Submenu
            title="Open Backlinks"
            icon={Icon.ArrowNe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          >
            {note.backlinks.map((backlink) => (
              <Action.Open
                key={backlink.id}
                title={backlink.title}
                target={backlink.url}
                icon={isDeleted ? { source: Icon.Trash, tintColor: Color.SecondaryText } : "notes-icon.png"}
              />
            ))}
          </ActionPanel.Submenu>
        ) : null}

        {noteTitles ? <RelatedNotes noteTitles={noteTitles} note={note} /> : null}

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
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Note URL"
          content={{
            html: `<a href=${getOpenNoteURL(note.UUID)} title="${note.title}">${note.title}</a>`,
            text: getOpenNoteURL(note.UUID),
          }}
          shortcut={Keyboard.Shortcut.Common.Copy}
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

type OpenNoteActionProps = {
  note: NoteItem;
  separately?: boolean;
  shortcut?: Keyboard.Shortcut;
};

function OpenNoteAction({ note, separately, shortcut }: OpenNoteActionProps) {
  async function openNoteInSeparateWindow() {
    try {
      await openNoteSeparately(note.id);
      await closeMainWindow();
    } catch (error) {
      await showFailureToast(error, { title: "Could not open note" });
    }
  }

  if (separately) {
    return (
      <Action
        title="Open in a Separate Window"
        icon={Icon.NewDocument}
        onAction={openNoteInSeparateWindow}
        shortcut={shortcut}
      />
    );
  } else {
    return (
      <Action.Open
        title="Open in Notes"
        target={getOpenNoteURL(note.UUID)}
        icon={{ fileIcon }}
        application="com.apple.notes"
        shortcut={shortcut}
      />
    );
  }
}

type RelatedNotesProps = {
  noteTitles?: NoteTitle[];
  note: NoteItem;
};

function RelatedNotes({ noteTitles, note }: RelatedNotesProps) {
  const [load, setLoad] = useState(false);

  const { data, isLoading } = usePromise(
    async () => {
      const prompt = `Find relevant notes to the following note:

"""
${note.title}
"""

Here are all of the notes titles with their UUIDs:
${JSON.stringify(noteTitles, null, 2)}

Return the output as a JSON array containing only the UUIDs of the related notes. The UUIDs should be in the following format:
["8743E9E4-CDB6-4026-8D62-0D2FD0B410F6","D75A980D-C5C4-4354-9216-4BA3B7C0F35F","11533A9C-9633-4424-A2C1-3E5FF6CE2A81"]

Only return a minified JSON array that is parsable, nothing else. Try to find between 3 to 10 related notes, even if they are not perfect matches.`;
      const result = await AI.ask(prompt, { model: "anthropic-claude-haiku" });
      // Because the AI can be dumb sometimes, let's use a regex to extract a JSON array from the response
      const jsonRegex = /\[.*\]/;
      const match = result.match(jsonRegex)?.[0];
      if (!match) throw new Error("Invalid response from AI model");
      const noteIds = JSON.parse(match);
      // The AI model might return the UUID of the original note, so we need to filter it out
      const noteIdsWithoutOriginalNote = noteIds.filter((id: string) => id !== note.UUID);
      const relatedNotes = noteTitles?.filter((n) => noteIdsWithoutOriginalNote.includes(n.uuid));
      return relatedNotes;
    },
    [],
    {
      execute: load,
      onError(error) {
        showFailureToast(error, { title: "Could not find related notes" });
      },
    },
  );

  return (
    <ActionPanel.Submenu
      title="Find Related Notes"
      isLoading={isLoading}
      icon={Icon.Stars}
      shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
      onOpen={() => setLoad(true)}
    >
      {isLoading ? (
        <Action title="Finding Related Notes…" icon={Icon.MagnifyingGlass} />
      ) : (
        data?.map((note) => {
          if (!note) return null;

          return (
            <Action.Open
              key={note.uuid}
              title={note.title}
              target={getOpenNoteURL(note.uuid)}
              icon={{ fileIcon }}
              application="com.apple.notes"
            />
          );
        })
      )}
    </ActionPanel.Submenu>
  );
}
