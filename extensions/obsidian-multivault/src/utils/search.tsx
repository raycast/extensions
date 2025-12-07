import { Media } from "./interfaces";
import Fuse from "fuse.js";
import { Note } from "../api/vault/notes/notes.types";
import { getNoteContent } from "../api/vault/vault.service";

// Cache for content during search to avoid redundant file reads
const contentCache = new Map<string, string>();

/**
 * Filters a list of notes according to the input search string. If the search string is empty, all notes are returned. It will match the notes title, path and content.
 *
 * @param notes - The notes to load the media for
 * @param input - Search input
 * @param byContent - If true, will use the content of the note to filter (only when title matches are insufficient).
 * @returns - A list of notes filtered according to the input search string
 */
export function filterNotes(notes: Note[], input: string, byContent: boolean) {
  if (input.length === 0) {
    return notes;
  }

  input = input.toLowerCase();

  // Always do fast title/path filter first
  const titleMatches = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(input) ||
      note.path.toLowerCase().includes(input)
  );

  // Only search content if enabled AND title search found few results
  if (byContent && titleMatches.length < 20) {
    const titleMatchPaths = new Set(titleMatches.map((n) => n.path));
    const contentMatches = notes.filter((note) => {
      if (titleMatchPaths.has(note.path)) return false;
      // Use cached content or load and cache
      let content = contentCache.get(note.path);
      if (!content) {
        content = getNoteContent(note, false).toLowerCase();
        contentCache.set(note.path, content);
      }
      return content.includes(input);
    });
    return [...titleMatches, ...contentMatches];
  }

  return titleMatches;
}

/** Clear the content cache (call when notes change) */
export function clearContentCache() {
  contentCache.clear();
}

export function filterNotesFuzzy(
  notes: Note[],
  input: string,
  byContent: boolean
) {
  if (input.length === 0) {
    return notes;
  }

  const options = {
    keys: ["title", "path"],
    fieldNormWeight: 2.0,
    ignoreLocation: true,
    threshold: 0.3,
  };

  // Note: Don't add "content" to Fuse keys - notes don't have content loaded (lazy loading)
  // Content search is done separately below when title/path search yields few results

  // Filter by each word individually, this helps with file path search
  const words = input.trim().split(/\s+/);
  let filteredNotes = notes;
  const fuse = new Fuse(notes, options);

  for (const word of words) {
    filteredNotes = fuse.search(word).map((result) => result.item);
    fuse.setCollection(filteredNotes);
  }

  // Only search content if enabled AND title/path search found few results
  if (byContent && filteredNotes.length < 20) {
    const titleMatchPaths = new Set(filteredNotes.map((n) => n.path));
    const remainingNotes = notes.filter((n) => !titleMatchPaths.has(n.path));
    const contentMatches = remainingNotes.filter((note) => {
      // Use cached content or load and cache
      let content = contentCache.get(note.path);
      if (!content) {
        content = getNoteContent(note, false).toLowerCase();
        contentCache.set(note.path, content);
      }
      return words.every((word) => content!.includes(word.toLowerCase()));
    });
    return [...filteredNotes, ...contentMatches];
  }

  return filteredNotes;
}

/**
 * Filters a list of media according to the input search string. If the input is empty, all media is returned. It will match the medias title, path and all notes mentioning the media.
 *
 * @param vault - Vault to search
 * @param input - Search input
 * @returns - A list of media filtered according to the input search string
 */
export function filterMedia(mediaList: Media[], input: string, notes: Note[]) {
  if (input?.length === 0) {
    return mediaList;
  }

  input = input.toLowerCase();

  notes = notes.filter((note) => note.title.toLowerCase().includes(input));

  return mediaList.filter((media) => {
    return (
      media.title.toLowerCase().includes(input) ||
      media.path.toLowerCase().includes(input) ||
      // Filter media that is mentioned in a note which has the searched title
      notes.some((note) => getNoteContent(note, false).includes(media.title))
    );
  });
}
