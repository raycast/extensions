import {
  List,
  ActionPanel,
  Icon,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { AuthWrapper } from "./components/AuthWrapper";
import { NoteListItem } from "./components/NoteListItem";
import { UtilityActionsSection } from "./components/CommonActions";
import {
  useFavoriteNotes,
  togglePin,
  archiveNote,
  deleteNote,
} from "./lib/hooks/useNotes";
import { fetchLatestSnippet } from "./lib/api/snippets";

function FavoritesContent() {
  const { data: notes, isLoading, mutate } = useFavoriteNotes();
  const handleTogglePin = async (noteId: string) => {
    try {
      await togglePin(noteId);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: "Pin toggled",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle pin",
        message: String(error),
      });
    }
  };

  const handleArchive = async (noteId: string) => {
    try {
      await archiveNote(noteId);
      await mutate();
      await showToast({
        style: Toast.Style.Success,
        title: "Note archived",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to archive note",
        message: String(error),
      });
    }
  };

  const handleDelete = async (noteId: string) => {
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

  const handleCopyLatest = async (noteId: string) => {
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
    <List isLoading={isLoading} searchBarPlaceholder="Search favorite notes...">
      {!isLoading && (!notes || notes.length === 0) ? (
        <List.EmptyView
          title="No Favorite Snippets"
          description="Mark snippets as favorites to see their notes here."
          icon={Icon.Heart}
          actions={
            <ActionPanel>
              <UtilityActionsSection />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title="Notes with Favorite Snippets"
          subtitle={`${notes?.length || 0} notes`}
        >
          {(notes || []).map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              onTogglePin={handleTogglePin}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onCopyLatest={handleCopyLatest}
              mutate={mutate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  return (
    <AuthWrapper>
      <FavoritesContent />
    </AuthWrapper>
  );
}
