import {
  List,
  showToast,
  Toast,
  Clipboard,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { AuthWrapper } from "./components/AuthWrapper";
import { NoteListItem } from "./components/NoteListItem";
import { UtilityActionsSection } from "./components/CommonActions";
import {
  useNotes,
  togglePin,
  archiveNote,
  deleteNote,
  filterNotes,
  groupNotes,
} from "./lib/hooks/useNotes";
import { fetchLatestSnippet } from "./lib/api/snippets";
import CreateNoteCommand from "./create-note";

function SearchNotesContent() {
  const { push } = useNavigation();
  const { data: notes, isLoading, mutate } = useNotes();
  const [searchText, setSearchText] = useState("");
  // Filter and group notes
  const filteredNotes = filterNotes(notes || [], searchText);
  const { pinned, recent } = groupNotes(filteredNotes);

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

  const emptyViewDescription = searchText
    ? "No notes match your search. Try a different query."
    : "You don't have any notes yet. Create your first note!";

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search notes by title or tag..."
      actions={
        <ActionPanel>
          <Action
            title="Create Note"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<CreateNoteCommand />)}
          />
        </ActionPanel>
      }
    >
      {!isLoading && filteredNotes.length === 0 ? (
        <List.EmptyView
          title="No Notes Found"
          description={emptyViewDescription}
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action
                title="Create Note"
                icon={Icon.Plus}
                onAction={() => push(<CreateNoteCommand />)}
              />
              <UtilityActionsSection />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {pinned.length > 0 && (
            <List.Section title="Pinned" subtitle={`${pinned.length} notes`}>
              {pinned.map((note) => (
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

          {recent.length > 0 && (
            <List.Section title="Recent" subtitle={`${recent.length} notes`}>
              {recent.map((note) => (
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
        </>
      )}
    </List>
  );
}

export default function Command() {
  return (
    <AuthWrapper>
      <SearchNotesContent />
    </AuthWrapper>
  );
}
