import { useCachedPromise } from "@raycast/utils";
import {
  fetchNotes,
  fetchNotesWithFavorites,
  fetchNote,
  fetchNotesByTag,
  fetchAllTags,
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  archiveNote,
  unarchiveNote,
} from "../api/notes";
import { NoteWithSnippetCount } from "../types";

/**
 * Hook to fetch all active notes
 */
export function useNotes() {
  return useCachedPromise(
    async () => {
      const notes = await fetchNotes({ archived: false });
      return notes;
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

/**
 * Hook to fetch archived notes
 */
export function useArchivedNotes() {
  return useCachedPromise(
    async () => {
      const notes = await fetchNotes({ archived: true });
      return notes;
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

/**
 * Hook to fetch notes with favorite snippets
 */
export function useFavoriteNotes() {
  return useCachedPromise(
    async () => {
      const notes = await fetchNotesWithFavorites();
      return notes;
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

/**
 * Hook to fetch a single note
 */
export function useNote(noteId: string | undefined) {
  return useCachedPromise(
    async (id: string) => {
      if (!id) return null;
      return fetchNote(id);
    },
    [noteId || ""],
    {
      execute: !!noteId,
      keepPreviousData: true,
    },
  );
}

/**
 * Hook to fetch notes by tag
 */
export function useNotesByTag(tag: string | undefined) {
  return useCachedPromise(
    async (t: string) => {
      if (!t) return [];
      return fetchNotesByTag(t);
    },
    [tag || ""],
    {
      execute: !!tag,
      keepPreviousData: true,
    },
  );
}

/**
 * Hook to fetch all tags
 */
export function useTags() {
  return useCachedPromise(
    async () => {
      return fetchAllTags();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}

// Re-export mutation functions for use in components
export {
  createNote,
  updateNote,
  deleteNote,
  togglePin,
  archiveNote,
  unarchiveNote,
};

/**
 * Sort notes with pinned first, then by updated_at
 */
export function sortNotes(
  notes: NoteWithSnippetCount[],
): NoteWithSnippetCount[] {
  return [...notes].sort((a, b) => {
    // Pinned notes first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    // Then by updated_at (newest first)
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

/**
 * Filter notes by search text
 */
export function filterNotes(
  notes: NoteWithSnippetCount[],
  searchText: string,
): NoteWithSnippetCount[] {
  if (!searchText.trim()) return notes;

  const search = searchText.toLowerCase();
  return notes.filter((note) => {
    const titleMatch = note.title.toLowerCase().includes(search);
    const tagMatch = note.tags?.some((tag) =>
      tag.toLowerCase().includes(search),
    );
    return titleMatch || tagMatch;
  });
}

/**
 * Group notes by pinned/not pinned
 */
export function groupNotes(notes: NoteWithSnippetCount[]): {
  pinned: NoteWithSnippetCount[];
  recent: NoteWithSnippetCount[];
} {
  const pinned = notes.filter((n) => n.pinned);
  const recent = notes.filter((n) => !n.pinned);

  return {
    pinned: pinned.sort(
      (a, b) =>
        new Date(b.pinned_at || 0).getTime() -
        new Date(a.pinned_at || 0).getTime(),
    ),
    recent: recent.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    ),
  };
}
