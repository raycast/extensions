import { useFetch } from "@raycast/utils";
import { useState } from "react";
import type { CharacterEntity, ListResponse, NoteEntity } from "crossbell";

export function useSearch() {
  const [text, setText] = useState<string>("");

  const { isLoading: isLoadingCharacters, data: characters } = useFetch<SearchResult["characters"]>(
    `https://indexer.crossbell.io/v1/characters/search?limit=3&q=${text}`,
    { execute: text.length > 0 },
  );

  const { isLoading: isLoadingNotes, data: notes } = useFetch<SearchResult["notes"]>(
    `https://indexer.crossbell.io/v1/notes/search?limit=20&q=${text}`,
    { execute: text.length > 0 },
  );

  const isLoading = text.length > 0 && (isLoadingCharacters || isLoadingNotes);
  const data = {
    characters,
    notes,
  };

  return {
    setText,
    text,
    isLoading,
    data,
  };
}

interface SearchResult {
  characters: ListResponse<CharacterEntity>;
  notes: ListResponse<NoteEntity>;
}
