import { Action, ActionPanel, Alert, Icon, confirmAlert } from "@raycast/api";
import type { Note, Book, Tag } from "../inkdrop";
import { NoteQuickLook } from "./NoteQuickLook";

const getNoteUri = (note: Note) => `inkdrop://note/${note._id.substring(5)}`;

export const NoteActions = ({
  note,
  books,
  tags,
  resolveImages,
  showQuickLook = true,
  onDelete,
}: {
  note: Note;
  books: Book[] | undefined;
  tags: Tag[] | undefined;
  resolveImages?: (body: string) => Promise<string>;
  showQuickLook?: boolean;
  onDelete?: (noteId: string) => Promise<void>;
}) => {
  const noteUri = getNoteUri(note);

  return (
    <>
      <ActionPanel.Section>
        {showQuickLook && (
          <Action.Push
            title="Quick Look"
            icon={Icon.Eye}
            target={
              <NoteQuickLook
                note={note}
                books={books}
                tags={tags}
                resolveImages={resolveImages ?? ((b) => Promise.resolve(b))}
                onDelete={onDelete}
              />
            }
          />
        )}
        <Action.Open title="Open in Inkdrop" icon={Icon.Link} target={noteUri} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Note Content"
          content={note.body}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />
        <Action.CopyToClipboard
          title="Copy Note Title"
          content={note.title}
          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
        />
        <Action.Paste
          title="Paste Note Content"
          content={note.body}
          shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
        />
        <Action.CopyToClipboard
          title="Copy Markdown Link"
          content={`[${note.title}](${noteUri})`}
          shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        />
        <Action.CopyToClipboard
          title="Copy Inkdrop Link"
          content={noteUri}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        />
      </ActionPanel.Section>
      {onDelete && (
        <ActionPanel.Section>
          <Action
            title="Delete Note"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={async () => {
              if (
                await confirmAlert({
                  title: "Delete Note",
                  message: `Are you sure you want to delete "${note.title}"?`,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                })
              ) {
                await onDelete(note._id);
              }
            }}
          />
        </ActionPanel.Section>
      )}
    </>
  );
};
