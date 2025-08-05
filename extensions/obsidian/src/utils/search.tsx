import { Media } from "./interfaces";
import Fuse from "fuse.js";
import { Note } from "../api/vault/notes/notes.types";

/**
 * Filters a list of notes according to the input search string. If the search string is empty, all notes are returned. It will match the notes title, path and content.
 *
 * @param notes - The notes to load the media for
 * @param input - Search input
 * @param byContent - If true, will use the content of the note to filter.
 * @returns - A list of notes filtered according to the input search string
 */
export function filterNotes(notes: Note[], input: string, byContent: boolean) {
  if (input.length === 0) {
    return notes;
  }

  input = input.toLowerCase();

  if (byContent) {
    return notes.filter(
      (note) =>
        note.content.toLowerCase().includes(input) ||
        note.title.toLowerCase().includes(input) ||
        note.path.toLowerCase().includes(input)
    );
  } else {
    return notes.filter((note) => note.title.toLowerCase().includes(input));
  }
}

export function filterNotesFuzzy(notes: Note[], input: string, byContent: boolean) {
  if (input.length === 0) {
    return notes;
  }

  const options = {
    keys: ["title", "path"],
    fieldNormWeight: 2.0,
    ignoreLocation: true,
    threshold: 0.3,
  };

  if (byContent) {
    options.keys.push("content");
  }

  // Filter by each word individually, this helps with file path search
  const words = input.trim().split(/\s+/);
  let filteredNotes = notes;
  const fuse = new Fuse(notes, options);

  for (const word of words) {
    filteredNotes = fuse.search(word).map((result) => result.item);
    fuse.setCollection(filteredNotes);
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
      notes.some((note) => note.content.includes(media.title))
    );
  });
}
