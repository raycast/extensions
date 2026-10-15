import { useState } from "react";
import type { IndexedNote } from "@type/notes";

type Options = {
  notes: IndexedNote[];
  previewByDefault: boolean;
  refreshNotes: () => void;
};

export type Result = {
  isVisible: boolean;
  selectedNoteId?: string;
  refreshKey: number;
  onSelectionChange: (id: string | null) => void;
  toggle: () => void;
  refresh: () => void;
};

export function useNotePreview({ notes, previewByDefault, refreshNotes }: Options): Result {
  const [isVisible, setIsVisible] = useState(previewByDefault);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? notes[0];

  return {
    isVisible,
    selectedNoteId: selectedNote?.id,
    refreshKey,
    onSelectionChange: setSelectedNoteId,
    toggle: () => setIsVisible((current) => !current),
    refresh: () => {
      refreshNotes();
      setRefreshKey((current) => current + 1);
    },
  };
}
