import { Cache } from "@raycast/api";
import { BYTES_PER_MEGABYTE } from "../../utils/constants";
import { Logger } from "../logger/logger.service";
import { Note } from "../vault/notes/notes.types";
import { loadNotes } from "../vault/vault.service";
import { Vault } from "../vault/vault.types";

//--------------------------------------------------------------------------------
// This cache is shared accross all commands.
//--------------------------------------------------------------------------------

const logger = new Logger("Cache");
const cache = new Cache({ capacity: BYTES_PER_MEGABYTE * 500 });

/**
 * Cache all notes for a given vault.
 *
 * @param vault - Vault to cache notes for
 * @returns The cached notes for the vault
 */
export function cacheNotesFor(vault: Vault) {
  const notes = loadNotes(vault);
  cache.set(
    vault.name,
    JSON.stringify({ lastCached: Date.now(), notes: notes })
  );
  return notes;
}

/**
 * Renews the cache for a given vault by reloading all notes from disk.
 *
 * @param vault - Vault to renew the cache for
 */
export function renewCache(vault: Vault) {
  logger.info("Renewing cache for vault: " + vault.name);
  cacheNotesFor(vault);
}

/**
 * Test if cache exists for a given vault.
 *
 * @param vault - Vault to test if cache exists for
 * @returns true if cache exists for vault
 */
export function cacheExistForVault(vault: Vault) {
  return cache.has(vault.name);
}

/**
 * Updates a note that has already been cached.
 *
 * @param vault - The Vault to update the note in
 * @param note - The updated note
 */

export function updateNoteInCache(vault: Vault, note: Note) {
  if (cacheExistForVault(vault)) {
    try {
      const data = JSON.parse(cache.get(vault.name) ?? "{}");
      data.notes = data.notes.map((n: Note) =>
        n.path === note.path ? note : n
      );
      cache.set(vault.name, JSON.stringify(data));
    } catch (error) {
      logger.warning(`Cache corrupted for vault ${vault.name}, clearing cache`);
      cache.remove(vault.name);
    }
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
    try {
      const data = JSON.parse(cache.get(vault.name) ?? "{}");
      data.notes = data.notes.filter((n: Note) => n.path !== note.path);
      cache.set(vault.name, JSON.stringify(data));
    } catch (error) {
      logger.warning(`Cache corrupted for vault ${vault.name}, clearing cache`);
      cache.remove(vault.name);
    }
  }
}

export function getNotesFromCache(vault: Vault) {
  if (cacheExistForVault(vault)) {
    try {
      const data = JSON.parse(cache.get(vault.name) ?? "{}");
      // Cache TTL: 30 minutes (increased from 5 for better performance)
      if (
        data.notes?.length > 0 &&
        data.lastCached > Date.now() - 1000 * 60 * 30
      ) {
        const notes_ = data.notes as Note[];
        logger.info("Using cached notes.");
        return notes_;
      }
    } catch (error) {
      logger.warning(`Cache corrupted for vault ${vault.name}, rebuilding cache`);
      cache.remove(vault.name);
    }
  }
  return cacheNotesFor(vault);
}

export function clearCache() {
  cache.clear();
}
