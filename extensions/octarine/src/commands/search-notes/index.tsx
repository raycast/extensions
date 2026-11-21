import { List } from "@raycast/api";
import { SearchNotesEmptyView } from "@components/empty-views/search-notes";
import { NotesList } from "@components/notes-list";
import { WorkspaceDropdown } from "@components/workspace-dropdown";
import { searchNotesPreferences } from "@lib/preferences";
import { NotesEmptyView, PinnedNotesEmptyView } from "./components/empty-views";
import { NoWorkspacesActionPanel, NoteItem, SearchNotesEmptyActionPanel } from "./components/notes";
import { useNotePreview } from "./hooks/use-note-preview";
import { useSearchNotes } from "./hooks/use-search";

export default function SearchNotesCommand() {
  const preferences = searchNotesPreferences();
  const { isLoading, search, mode, workspace, results, actions } = useSearchNotes({
    searchContent: preferences.searchContent,
    showPinnedNotesFirst: preferences.showPinnedNotesFirst,
  });
  const notes = results.sections.flatMap((section) => section.notes);
  const preview = useNotePreview({
    notes,
    previewByDefault: preferences.previewNotesByDefault,
    refreshNotes: actions.refresh,
  });
  const hasResults = notes.length > 0;
  const noWorkspacesPanel = <NoWorkspacesActionPanel onRefresh={preview.refresh} />;
  const noResultsPanel = <SearchNotesEmptyActionPanel mode={mode} actions={actions} onRefresh={preview.refresh} />;

  return (
    <List
      filtering={false}
      isLoading={isLoading}
      isShowingDetail={preview.isVisible && hasResults}
      throttle={mode.contentEnabled}
      onSearchTextChange={actions.onSearchTextChange}
      onSelectionChange={preview.onSelectionChange}
      searchBarPlaceholder={searchPlaceholder(mode.contentEnabled)}
      searchBarAccessory={
        <WorkspaceDropdown
          workspaces={workspace.dropdown}
          value={workspace.selected}
          onChange={actions.onWorkspaceChange}
        />
      }
    >
      {workspace.dropdown.length === 0 ? (
        <NotesEmptyView actions={noWorkspacesPanel} />
      ) : mode.pinnedOnly && !search.text && !hasResults ? (
        <PinnedNotesEmptyView actions={noResultsPanel} />
      ) : !hasResults ? (
        <SearchNotesEmptyView actions={noResultsPanel} />
      ) : (
        <NotesList
          sections={results.sections}
          grouped={workspace.grouped}
          counter={preferences.showWorkspaceNoteCount}
          renderNote={(note) => (
            <NoteItem
              key={note.id}
              result={{ note, match: results.matchOf(note) }}
              mode={mode}
              actions={actions}
              preview={preview}
            />
          )}
        />
      )}
    </List>
  );
}

function searchPlaceholder(contentEnabled: boolean): string {
  return contentEnabled ? "Search titles, paths, and content" : "Search notes";
}
