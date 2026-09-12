import { Cache } from "@raycast/api";
import { BYTES_PER_MEGABYTE } from "../constants";
import { Note, Vault } from "../interfaces";
import { NoteLoader } from "./loader";

//--------------------------------------------------------------------------------
// This cache is shared accross all commands.
//--------------------------------------------------------------------------------

const cache = new Cache({ capacity: BYTES_PER_MEGABYTE * 500 });

/**
 * Cache all notes for a given vault.
 *
 * @param vault - Vault to cache notes for
 * @returns The cached notes for the vault
 */
export function cacheNotesFor(vault: Vault) {
  const nl = new NoteLoader(vault);
  const notes = nl.loadNotes();
  cache.set(vault.name, JSON.stringify({ lastCached: Date.now(), notes: notes }));
  return notes;
}

/**
 * Renews the cache for a given vault by reloading all notes from disk.
 *
 * @param vault - Vault to renew the cache for
 */
export function renewCache(vault: Vault) {
  console.log("Renew Cache");
  cacheNotesFor(vault);
}

/**
 * Test if cache exists for a given vault.
 *
 * @param vault - Vault to test if cache exists for
 * @returns true if cache exists for vault
 */
export function cacheExistForVault(vault: Vault) {
  if (cache.has(vault.name)) {
    return true;
  } else {
    console.log("Cache does not exist for vault: " + vault.name);
  }
}

/**
 * Updates a note that has already been cached.
 *
 * @param vault - The Vault to update the note in
 * @param note - The updated note
 */

export function updateNoteInCache(vault: Vault, note: Note) {
  if (cacheExistForVault(vault)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    data.notes = data.notes.map((n: Note) => (n.path === note.path ? note : n));
    cache.set(vault.name, JSON.stringify(data));
  }
}

/**
 * Deletes a note from the cache.
 *
 * @param vault - The Vault to delete the note from
 * @param note - The note to delete from the cache
 */
export function deleteNoteFromCache(vault: Vault, note: Note) {
  if (cacheExistForVault(vault)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    data.notes = data.notes.filter((n: Note) => n.path !== note.path);
    cache.set(vault.name, JSON.stringify(data));
  }
}

export function getNotesFromCache(vault: Vault) {
  if (cacheExistForVault(vault)) {
    const data = JSON.parse(cache.get(vault.name) ?? "");
    if (data.lastCached > Date.now() - 1000 * 60 * 5) {
      const notes_ = data.notes;
      console.log("Returning cached notes");
      return notes_;
    }
  }
  return cacheNotesFor(vault);
}
