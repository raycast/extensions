import { useFetch } from "@raycast/utils";
import type { ListResponse, NoteEntity } from "crossbell";

export function useNotes(characterId?: number) {
  const { isLoading, data } = useFetch<ListResponse<NoteEntity>>(
    `https://indexer.crossbell.io/v1/characters/${characterId}/notes?limit=20`,
    { execute: Boolean(characterId) },
  );

  return {
    isLoading,
    data,
  };
}

export function useNote(characterId?: number | null, noteId?: number | null) {
  const { isLoading, data } = useFetch<NoteEntity>(`https://indexer.crossbell.io/v1/notes/${characterId}/${noteId}`, {
    execute: Boolean(characterId) && Boolean(noteId),
  });

  return {
    isLoading,
    data,
  };
}
