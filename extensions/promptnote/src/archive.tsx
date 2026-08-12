import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  Clipboard,
  Color,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { AuthWrapper } from "./components/AuthWrapper";
import { NoteDetail } from "./components/NoteDetail";
import {
  useArchivedNotes,
  unarchiveNote,
  deleteNote,
} from "./lib/hooks/useNotes";
import { fetchLatestSnippet } from "./lib/api/snippets";
import { NoteWithSnippetCount } from "./lib/types";
import {
  GlobalActionsSection,
  UtilityActionsSection,
} from "./components/CommonActions";

function ArchiveContent() {
  const { push } = useNavigation();
  const { data: notes, isLoading, mutate } = useArchivedNotes();

  const handleUnarchive = async (noteId: string) => {
    try {
      await unarchiveNote(noteId);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: "Note unarchived",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to unarchive note",
        message: String(error),
      });
    }
  };

  const handleDelete = async (noteId: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Note Permanently?",
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    try {
      await deleteNote(noteId);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: "Note deleted",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete note",
        message: String(error),
      });
    }
  };

  const handleCopy = async (noteId: string) => {
    try {
      const snippet = await fetchLatestSnippet(noteId);
      if (snippet) {
        await Clipboard.copy(snippet.content);
        await showToast({
          style: Toast.Style.Success,
          title: "Copied to clipboard",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No snippets to copy",
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy",
        message: String(error),
      });
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search archived notes...">
      {!isLoading && (!notes || notes.length === 0) ? (
        <List.EmptyView
          title="No Archived Notes"
          description="Notes you archive will appear here for safekeeping."
          icon={Icon.Tray}
          actions={
            <ActionPanel>
              <UtilityActionsSection />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Archived Notes"
          subtitle={`${notes?.length || 0} notes`}
        >
          {(notes || []).map((note) => (
            <ArchivedNoteItem
              key={note.id}
              note={note}
              onView={() =>
                push(<NoteDetail noteId={note.id} mutate={mutate} />)
              }
              onUnarchive={() => handleUnarchive(note.id)}
              onDelete={() => handleDelete(note.id)}
              onCopy={() => handleCopy(note.id)}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

interface ArchivedNoteItemProps {
  note: NoteWithSnippetCount;
  onView: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

function ArchivedNoteItem({
  note,
  onView,
  onUnarchive,
  onDelete,
  onCopy,
}: ArchivedNoteItemProps) {
  const accessories: List.Item.Accessory[] = [];

  // Archived indicator
  accessories.push({
    icon: { source: Icon.Tray, tintColor: Color.Orange },
    tooltip: "Archived",
  });

  // Tag badges
  if (note.tags && note.tags.length > 0) {
    note.tags.slice(0, 2).forEach((tag) => {
      accessories.push({
        tag: { value: tag, color: Color.SecondaryText },
      });
    });
  }

  // Snippet count
  accessories.push({
    text: `${note.snippetCount} snippets`,
  });

  // Archived date
  if (note.archived_at) {
    accessories.push({
      date: new Date(note.archived_at),
      tooltip: `Archived: ${new Date(note.archived_at).toLocaleString()}`,
    });
  }

  return (
    <List.Item
      id={note.id}
      title={note.title}
      subtitle={note.tags?.join(", ")}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="View Snippets" icon={Icon.Eye} onAction={onView} />
            <Action
              title="Copy Latest Snippet"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={onCopy}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Unarchive"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["cmd"], key: "u" }}
              onAction={onUnarchive}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title="Delete Permanently"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd"], key: "backspace" }}
              onAction={onDelete}
            />
          </ActionPanel.Section>

          <GlobalActionsSection noteId={note.id} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <AuthWrapper>
      <ArchiveContent />
    </AuthWrapper>
  );
}
