import { Cache } from "@raycast/api";
import { BYTES_PER_MEGABYTE } from "./constants";
import { Note, Vault } from "./interfaces";
import { NoteLoader } from "./loader";

//--------------------------------------------------------------------------------
// This cache is shared accross all commands.
// Use updateNoteInCache to update one specific note without having to reload all notes.
//--------------------------------------------------------------------------------

const cache = new Cache({ capacity: BYTES_PER_MEGABYTE * 500 });

function cacheNotesFor(vault: Vault) {
  const nl = new NoteLoader(vault);
  const notes = nl.loadNotes();
  cache.set(vault.name, JSON.stringify({ lastCached: Date.now(), notes: notes }));
  return notes;
}

export function renewCache(vault: Vault) {
  console.log("Renew Cache");
  cacheNotesFor(vault);
}

function cacheExistForVault(vault: Vault) {
  if (cache.has(vault.name)) {
    return true;
  } else {
    console.log("Cache does not exist for vault: " + vault.name);
  }
}

export function updateNoteInCache(vault: Vault, note: Note) {
  if (cacheExistForVault(vault)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    data.notes = data.notes.map((n: Note) => (n.path === note.path ? note : n));
    cache.set(vault.name, JSON.stringify(data));
  }
}

export function deleteNoteFromCache(vault: Vault, note: Note) {
  if (cacheExistForVault(vault)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    data.notes = data.notes.filter((n: Note) => n.path !== note.path);
    cache.set(vault.name, JSON.stringify(data));
  }
}

export function useNotes(vault: Vault) {
  console.log(vault.name);
  if (cacheExistForVault(vault)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    if (data.lastCached > Date.now() - 1000 * 60 * 5) {
      console.log("Cache still valid");
      return data.notes;
    }
  }
  return cacheNotesFor(vault);
}
