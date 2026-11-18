import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  useNavigation,
} from "@raycast/api";
import { NoteWithSnippetCount } from "../lib/types";
import { NoteDetail } from "./NoteDetail";
import { EditNoteForm } from "./EditNoteForm";
import { GlobalActionsSection } from "./CommonActions";

interface NoteListItemProps {
  note: NoteWithSnippetCount;
  onTogglePin: (noteId: string) => Promise<void>;
  onArchive: (noteId: string) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
  onCopyLatest: (noteId: string) => Promise<void>;
  mutate: () => void;
}

export function NoteListItem({
  note,
  onTogglePin,
  onArchive,
  onDelete,
  onCopyLatest,
  mutate,
}: NoteListItemProps) {
  const { push } = useNavigation();

  // Build accessories
  const accessories: List.Item.Accessory[] = [];

  // Protected (lock) icon - show first as it's important
  if (note.is_protected) {
    accessories.push({
      icon: { source: Icon.Lock, tintColor: Color.Orange },
      tooltip: "PIN Protected",
    });
  }

  // Pin icon
  if (note.pinned) {
    accessories.push({
      icon: { source: Icon.Pin, tintColor: Color.Yellow },
      tooltip: "Pinned",
    });
  }

  // Tag badges (show first 2 tags)
  if (note.tags && note.tags.length > 0) {
    const displayTags = note.tags.slice(0, 2);
    displayTags.forEach((tag) => {
      accessories.push({
        tag: { value: tag, color: Color.Blue },
      });
    });

    // Show "+N more" if there are more tags
    if (note.tags.length > 2) {
      accessories.push({
        tag: { value: `+${note.tags.length - 2}`, color: Color.SecondaryText },
      });
    }
  }

  // Snippet count
  accessories.push({
    text: `${note.snippetCount} snippet${note.snippetCount !== 1 ? "s" : ""}`,
    icon: Icon.Document,
  });

  // Updated date
  accessories.push({
    date: new Date(note.updated_at),
    tooltip: `Updated: ${new Date(note.updated_at).toLocaleString()}`,
  });

  return (
    <List.Item
      id={note.id}
      title={note.title}
      subtitle={note.tags?.join(", ")}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="View Snippets"
              icon={Icon.Eye}
              onAction={() =>
                push(<NoteDetail noteId={note.id} mutate={mutate} />)
              }
            />
            <Action
              title="Copy Latest Snippet"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={() => onCopyLatest(note.id)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Edit Note"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={() =>
                push(<EditNoteForm note={note} onSuccess={mutate} />)
              }
            />
            <Action
              title={note.pinned ? "Unpin" : "Pin"}
              icon={note.pinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
              onAction={async () => {
                await onTogglePin(note.id);
                mutate();
              }}
            />
            <Action
              title="Archive"
              icon={Icon.Tray}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={async () => {
                await onArchive(note.id);
                mutate();
              }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Delete"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={async () => {
                await onDelete(note.id);
                mutate();
              }}
            />
          </ActionPanel.Section>

          <GlobalActionsSection noteId={note.id} />
        </ActionPanel>
      }
    />
  );
}
