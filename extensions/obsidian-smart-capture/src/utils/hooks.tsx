import { useContext, useState } from "react";
import { getNotesFromCache } from "./data/cache";
import { Note, Vault } from "./interfaces";
import { NotesContext, NotesDispatchContext } from "./utils";

export function useNotes(vault: Vault, bookmarked = false) {
  /**
   * The preferred way of loading notes inside the extension
   *
   * @param vault - The Vault to get the notes from
   * @returns All notes in the cache for the vault
   */

  const notes_: Note[] = getNotesFromCache(vault);

  const [notes] = useState<Note[]>(notes_);
  console.log("Using Notes");
  if (bookmarked) {
    return [notes.filter((note: Note) => note.bookmarked)] as const;
  } else {
    return [notes] as const;
  }
}

export function useNotesContext() {
  return useContext(NotesContext);
}

export function useNotesDispatchContext() {
  return useContext(NotesDispatchContext);
}
