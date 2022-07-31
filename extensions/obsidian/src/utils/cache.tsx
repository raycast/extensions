import { Cache } from "@raycast/api";
import { BYTES_PER_MEGABYTE } from "./constants";
import { Note, Vault } from "./interfaces";
import { NoteLoader } from "./loader";

//--------------------------------------------------------------------------------
// This cache is shared accross all commands.
// Use updateNoteInCache to update one specific note without having to reload all notes.
//--------------------------------------------------------------------------------

const cache = new Cache({ capacity: BYTES_PER_MEGABYTE * 500 });

export function renewCache(vault: Vault) {
  console.log("Renew Cache");
  const nl = new NoteLoader(vault);
  const notes = nl.loadNotes();
  cache.set(vault.name, JSON.stringify({ lastCached: Date.now(), notes: notes }));
}

export function updateNoteInCache(vault: Vault, note: Note) {
  if (cache.has(vault.name)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    data.notes = data.notes.map((n: Note) => (n.path === note.path ? note : n));
    cache.set(vault.name, JSON.stringify(data));
  } else {
    console.log("Cache not found");
  }
}

export function useNotes(vault: Vault) {
  console.log(vault.name);
  if (cache.has(vault.name)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    if (data.lastCached > Date.now() - 1000 * 60 * 5) {
      console.log("Cache still valid");
      return data.notes;
    }
  } else {
    console.log("Cache not found");
  }
  const nl = new NoteLoader(vault);
  const notes = nl.loadNotes();
  cache.set(vault.name, JSON.stringify({ lastCached: Date.now(), notes: notes }));

  return notes;
}
