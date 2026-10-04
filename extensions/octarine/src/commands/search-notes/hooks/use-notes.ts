import { Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { useNoteSections } from "@hooks/use-note-sections";
import { extensionPreferences } from "@lib/preferences";
import { getNotes } from "@lib/notes";
import { createSearchMatcher } from "@lib/search";
import type { Workspace } from "@type/octarine";
import type { IndexedNote, WorkspaceSection } from "@type/notes";
import { noteMatch, type ContentMatch, type NoteMatch } from "../lib/note-search";

const EMPTY_CONTENT_MATCHES = new Map<string, ContentMatch>();
const NO_FILTER = () => true;

type Options = {
  workspaces: Workspace[];
  enabled?: boolean;
  searchText: string;
  contentMatches?: ReadonlyMap<string, ContentMatch>;
  filter?: (note: IndexedNote) => boolean;
  selectedWorkspace: string;
  showPinnedNotesFirst?: boolean;
  refresh?: boolean;
};

type Result = {
  dropdown: Workspace[];
  sections: WorkspaceSection[];
  isLoading: boolean;
  revalidate: () => void;
  matchOf: (note: IndexedNote) => NoteMatch | undefined;
};

export function useNotes({
  workspaces,
  enabled = true,
  searchText,
  contentMatches = EMPTY_CONTENT_MATCHES,
  filter = NO_FILTER,
  selectedWorkspace,
  showPinnedNotesFirst = false,
  refresh = false,
}: Options): Result {
  const preferences = extensionPreferences();
  const excludedKey = JSON.stringify([...preferences.excludedFoldersInWorkspaces].sort());

  const {
    data: notes,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (refresh: boolean, workspaces: Workspace[], excludedKey: string): Promise<IndexedNote[]> => {
      const excludedDirectories = new Set(JSON.parse(excludedKey) as string[]);
      return getNotes(workspaces, excludedDirectories, { refresh });
    },
    [refresh, workspaces, excludedKey],
    {
      execute: enabled,
      initialData: [] satisfies IndexedNote[],
      keepPreviousData: true,
      onError: async (error) => {
        console.error(`Failed to scan Octarine notes`, error);
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to Scan Notes`,
          message: error instanceof Error ? error.message : String(error),
        });
      },
      onData: () => {
        if (refresh) {
          showToast({
            style: Toast.Style.Success,
            title: "Notes refreshed",
          });
        }
      },
    },
  );

  const matchesMetadata = useMemo(() => createSearchMatcher(searchText), [searchText]);
  const matchOf = useMemo(
    () => (note: IndexedNote) => noteMatch(note, { matchesMetadata, contentMatches }),
    [contentMatches, matchesMetadata],
  );
  const matches = useMemo(() => (note: IndexedNote) => filter(note) && matchOf(note) !== undefined, [filter, matchOf]);
  const orderedNotes = useMemo(() => {
    if (contentMatches.size === 0) return notes;

    return notes.toSorted((a, b) => Number(!matchesMetadata(a)) - Number(!matchesMetadata(b)));
  }, [contentMatches, matchesMetadata, notes]);
  const { dropdown, sections } = useNoteSections(orderedNotes, {
    workspaces,
    selectedWorkspace,
    matches,
    showPinnedNotesFirst,
  });

  return {
    dropdown,
    sections,
    isLoading: !enabled || isLoading,
    revalidate,
    matchOf,
  };
}
