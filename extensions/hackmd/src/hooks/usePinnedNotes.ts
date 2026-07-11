import { useLocalStorage } from "@raycast/utils";
import type { Note } from "@hackmd/api/dist/type";
import { useCallback } from "react";

export type PinnedNote = {
  noteId: string;
  pinnedAt: number;
};

export type PinnedNotesMap = Record<string, PinnedNote[]>;

const STORAGE_KEY = "pinned-notes";

export function usePinnedNotes() {
  const { value: pinnedNotesMap, setValue, isLoading } = useLocalStorage<PinnedNotesMap>(STORAGE_KEY, {});

  const getWorkspaceKey = useCallback((note: Note) => {
    return note.teamPath || "personal";
  }, []);

  const isPinned = useCallback(
    (note: Note) => {
      const workspaceKey = getWorkspaceKey(note);
      const pinned = pinnedNotesMap?.[workspaceKey] || [];
      return pinned.some((p) => p.noteId === note.id);
    },
    [pinnedNotesMap, getWorkspaceKey],
  );

  const togglePin = useCallback(
    async (note: Note) => {
      const workspaceKey = getWorkspaceKey(note);
      const currentPinned = pinnedNotesMap?.[workspaceKey] || [];
      const alreadyPinned = currentPinned.some((p) => p.noteId === note.id);

      let newPinned: PinnedNote[];
      if (alreadyPinned) {
        newPinned = currentPinned.filter((p) => p.noteId !== note.id);
      } else {
        newPinned = [...currentPinned, { noteId: note.id, pinnedAt: Date.now() }];
      }

      await setValue({
        ...pinnedNotesMap,
        [workspaceKey]: newPinned,
      });
    },
    [pinnedNotesMap, setValue, getWorkspaceKey],
  );

  return {
    pinnedNotesMap: pinnedNotesMap || {},
    isPinned,
    togglePin,
    isLoading,
  };
}
