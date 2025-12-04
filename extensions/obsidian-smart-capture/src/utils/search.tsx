import { Media, Note } from "./interfaces";

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

/**
 * Filters a list of media according to the input search string. If the input is empty, all media is returned. It will match the medias title, path and all notes mentioning the media.
 *
 * @param vault - Vault to search
 * @param input - Search input
 * @returns - A list of media filtered according to the input search string
 */
export function filterMedia(mediaList: Media[], input: string, notes: Note[]) {
  if (input.length === 0) {
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

export function fuzzyFilter(notes: Note[], input: string) {
  if (input.length === 0) {
    return notes;
  }
  input = input.toLowerCase();

  // TODO: weigh tokens before using them

  return notes.filter((note) => {
    return note.title.toLowerCase().includes(input) || note.path.toLowerCase().includes(input);
  });
}
