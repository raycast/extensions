import { List, getPreferenceValues } from "@raycast/api";
import { memo, useState, useEffect } from "react";
import { MAX_RENDERED_NOTES } from "../../utils/constants";
import { NoteListItem } from "./NoteListItem/NoteListItem";
import { NoteListDropdown } from "./NoteListDropdown";
import { SearchNotePreferences } from "../../utils/preferences";
import { CreateNoteView } from "./CreateNoteView";
import { filterNotesFuzzy } from "../../api/search/search.service";
import { NoteSearchResult, searchNotesWithMatches } from "../../api/search/content-match.service";
import { runSearchRequest } from "../../api/search/search-request.service";
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

function resultsForNotes(notes: Note[]): NoteSearchResult[] {
  return notes.map((note) => ({ id: note.path, note }));
}

function sortSearchResults(results: NoteSearchResult[], sortOrder: SortOrder): NoteSearchResult[] {
  if (sortOrder === "relevance") return results;

  const uniqueNotes = Array.from(new Map(results.map((result) => [result.note.path, result.note])).values());
  const noteOrder = new Map(sortNotes(uniqueNotes, sortOrder).map((note, index) => [note.path, index]));

  return [...results].sort((a, b) => {
    const noteComparison = (noteOrder.get(a.note.path) ?? 0) - (noteOrder.get(b.note.path) ?? 0);
    if (noteComparison !== 0) return noteComparison;
    return (a.match?.line ?? 0) - (b.match?.line ?? 0);
  });
}

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
  const [filteredResults, setFilteredResults] = useState<NoteSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(!!initialSearchText);
  const [sortOrder, setSortOrder] = useState<SortOrder>("relevance");

  // Search with or without content based on preference
  useEffect(() => {
    let cancelled = false;

    if (!inputText.trim()) {
      const sorted = sortNotes(notes, sortOrder);
      setFilteredResults(resultsForNotes(sorted.slice(0, MAX_RENDERED_NOTES)));
      setIsSearching(false);
      return;
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      setIsSearching(true);
      const isStale = () => cancelled;
      void runSearchRequest({
        search: async () => {
          let results: NoteSearchResult[];
          if (pref.searchContent) {
            // Search title, path, and individual content occurrences.
            results = await searchNotesWithMatches(notes, inputText, isStale);
          } else {
            // Search only title and path (fast)
            results = resultsForNotes(filterNotesFuzzy(notes, inputText));
          }
          const sorted = sortSearchResults(results, sortOrder);
          return sorted.slice(0, MAX_RENDERED_NOTES);
        },
        isStale,
        onResults: setFilteredResults,
        onSettled: () => setIsSearching(false),
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [notes, inputText, pref.searchContent, sortOrder]);

  if (filteredResults.length === 0 && inputText.trim() !== "" && !isSearching && !isLoading) {
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
      {filteredResults.map((result, idx) => (
        <MemoizedNoteListItem
          result={result}
          vault={vault}
          key={result.id}
          pref={pref}
          selectedItemId={!selectedItemId ? (idx === 0 ? result.id : null) : selectedItemId}
          onNoteUpdated={onNoteUpdated}
          onDelete={(deletedNote) => {
            // Remove from the original notes list via the hook
            onDelete?.(deletedNote);
            // Also remove from the filtered list for immediate UI update
            setFilteredResults((prev) => prev.filter((item) => item.note.path !== deletedNote.path));
          }}
        />
      ))}
    </List>
  );
}
