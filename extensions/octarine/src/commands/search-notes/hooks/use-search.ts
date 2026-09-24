import { useCallback, useState } from "react";
import { useWorkspaces } from "@hooks/use-workspaces";
import { ALL_WORKSPACES, type IndexedNote, type WorkspaceSection } from "@type/notes";
import type { NoteMatch } from "../lib/note-search";
import { useContentSearch } from "./use-content-search";
import { useNotes } from "./use-notes";

export type SearchNotesMode = {
  pinnedOnly: boolean;
  contentEnabled: boolean;
};

export type SearchNotesActions = {
  onSearchTextChange: (text: string) => void;
  onWorkspaceChange: (workspace: string) => void;
  togglePinned: () => void;
  toggleContent: () => void;
  refresh: () => void;
};

type Options = {
  searchContent: boolean;
  showPinnedNotesFirst: boolean;
};

type Result = {
  isLoading: boolean;
  search: { text: string };
  mode: SearchNotesMode;
  workspace: { dropdown: string[]; selected: string; grouped: boolean };
  results: { sections: WorkspaceSection[]; matchOf: (note: IndexedNote) => NoteMatch | undefined };
  actions: SearchNotesActions;
};

/** When content search fails or lacks permission, `mode.contentEnabled` turns off so results fall back to titles and paths. */
export function useSearchNotes({ searchContent, showPinnedNotesFirst }: Options): Result {
  const [searchText, setSearchText] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [contentEnabled, setContentEnabled] = useState(searchContent);
  const [selectedWorkspace, setSelectedWorkspace] = useState(ALL_WORKSPACES);
  const [refresh, setRefresh] = useState(false);
  const filter = useCallback((note: IndexedNote) => (pinnedOnly ? note.pinned : true), [pinnedOnly]);
  const {
    workspaces,
    status: { isLoading: isWorkspacesLoading },
  } = useWorkspaces({ refresh });
  const disableContentSearch = useCallback(() => setContentEnabled(false), []);
  const {
    matches: contentMatches,
    isLoading: isContentLoading,
    revalidate: revalidateNotesContent,
  } = useContentSearch({
    enabled: contentEnabled,
    searchText,
    onError: disableContentSearch,
  });
  const {
    dropdown,
    sections,
    isLoading,
    revalidate: revalidateNotes,
    matchOf,
  } = useNotes({
    workspaces,
    enabled: !isWorkspacesLoading,
    searchText,
    contentMatches,
    filter,
    selectedWorkspace,
    showPinnedNotesFirst,
    refresh,
  });

  return {
    isLoading: isLoading || isContentLoading,
    search: { text: searchText },
    mode: { pinnedOnly, contentEnabled },
    workspace: {
      dropdown,
      selected: selectedWorkspace,
      grouped: selectedWorkspace === ALL_WORKSPACES,
    },
    results: { sections, matchOf },
    actions: {
      onSearchTextChange: setSearchText,
      onWorkspaceChange: setSelectedWorkspace,
      togglePinned: () => setPinnedOnly((current) => !current),
      toggleContent: () => setContentEnabled((current) => !current),
      refresh: () => {
        if (refresh) {
          revalidateNotes();
        } else {
          setRefresh(true);
        }

        revalidateNotesContent();
      },
    },
  };
}
