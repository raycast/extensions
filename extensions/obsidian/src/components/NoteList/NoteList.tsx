import { List, getPreferenceValues } from "@raycast/api";
import { memo, useState, useEffect } from "react";
import { MAX_RENDERED_NOTES } from "../../utils/constants";
import { NoteListItem } from "./NoteListItem/NoteListItem";
import { NoteListDropdown } from "./NoteListDropdown";
import { SearchNotePreferences } from "../../utils/preferences";
import { CreateNoteView } from "./CreateNoteView";
import { filterNotesFuzzy } from "../../api/search/search.service";
import { searchNotesWithContent } from "../../api/search/simple-content-search.service";
import { SearchArguments } from "../../utils/interfaces";
import { sortNotes, SortOrder } from "../../utils/sorting";
import { Note, ObsidianVault } from "@/obsidian";

export interface NoteListProps {
  title?: string;
  vault: ObsidianVault;
  notes: Note[];
  isLoading?: boolean;
  searchArguments: SearchArguments;
  action?: (note: Note, vault: ObsidianVault) => React.ReactNode;
  onDelete?: (note: Note) => void;
  onSearchChange?: (search: string) => void;
  onNoteUpdated?: (notePath: string, updates: Partial<Note>) => void;
}

const MemoizedNoteListItem = memo(NoteListItem);

export function NoteList(props: NoteListProps) {
  const { notes, vault, title, searchArguments, isLoading, onNoteUpdated, onDelete } = props;

  const pref = getPreferenceValues<SearchNotePreferences>();

  // Combine searchArgument and tagArgument into a single search string with tag: syntax
  const initialSearchText = (() => {
    const parts: string[] = [];
    if (searchArguments.tagArgument) {
      parts.push(`tag:${searchArguments.tagArgument}`);
    }
    if (searchArguments.searchArgument) {
      parts.push(searchArguments.searchArgument);
    }
    return parts.join(" ");
  })();

  const [inputText, setInputText] = useState(initialSearchText);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(!!initialSearchText);
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");

  // Search with or without content based on preference
  useEffect(() => {
    if (!inputText.trim()) {
      const sorted = sortNotes(notes, sortOrder);
      setFilteredNotes(sorted.slice(0, MAX_RENDERED_NOTES));
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        let results: Note[];
        if (pref.searchContent) {
          // Search title, path, AND content
          results = await searchNotesWithContent(notes, inputText);
        } else {
          // Search only title and path (fast)
          results = filterNotesFuzzy(notes, inputText);
        }
        const sorted = sortNotes(results, sortOrder);
        setFilteredNotes(sorted.slice(0, MAX_RENDERED_NOTES));
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [notes, inputText, pref.searchContent, sortOrder]);

  if (filteredNotes.length === 0 && inputText.trim() !== "" && !isSearching && !isLoading) {
    return <CreateNoteView title={title || ""} searchText={inputText} onSearchChange={setInputText} vault={vault} />;
  }

  return (
    <List
      isLoading={isLoading || isSearching}
      throttle={true}
      isShowingDetail={pref.showDetail}
      searchText={inputText}
      onSearchTextChange={setInputText}
      onSelectionChange={setSelectedItemId}
      navigationTitle={title}
      searchBarAccessory={<NoteListDropdown sortOrder={sortOrder} setSortOrder={setSortOrder} />}
    >
      {filteredNotes.map((note, idx) => (
        <MemoizedNoteListItem
          note={note}
          vault={vault}
          key={note.path}
          pref={pref}
          selectedItemId={!selectedItemId ? (idx === 0 ? note.path : null) : selectedItemId}
          onNoteUpdated={onNoteUpdated}
          onDelete={(deletedNote) => {
            // Remove from the original notes list via the hook
            onDelete?.(deletedNote);
            // Also remove from the filtered list for immediate UI update
            setFilteredNotes((prev) => prev.filter((n) => n.path !== deletedNote.path));
          }}
        />
      ))}
    </List>
  );
}
