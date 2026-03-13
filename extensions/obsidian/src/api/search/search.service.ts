import { Note } from "@/obsidian";
import Fuse from "fuse.js";
import { Media } from "../../utils/interfaces";

/**
 * Fuzzy search notes by title and path (metadata only, no content)
 */
export function filterNotesFuzzy(notes: Note[], input: string): Note[] {
  if (input.length === 0) {
    return notes;
  }

  const options = {
    keys: ["title", "path"],
    fieldNormWeight: 2.0,
    ignoreLocation: true,
    threshold: 0.3,
  };

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
export function filterMedia(mediaList: Media[], input: string) {
  if (input?.length === 0) {
    return mediaList;
  }

  input = input.toLowerCase();

  // notes = notes.filter((note) => note.title.toLowerCase().includes(input));

  return mediaList.filter((media) => {
    return media.title.toLowerCase().includes(input) || media.path.toLowerCase().includes(input);
    // Filter media that is mentioned in a note which has the searched title
    // TODO: add information about where the media is linked during indexing
    // notes.some((note) => note.content.includes(media.title))
  });
}
