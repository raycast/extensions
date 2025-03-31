import { atom } from "jotai";
import { atomWithReset, RESET } from "jotai/utils";
import { TAGS_FILE_PATH, TODO_FILE_PATH, preferences } from "./config";
import fs from "fs";
import {
  deleteNotesInFolder,
  exportNotes,
  getDeletedNote,
  getDeletedTags,
  getInitialValuesFromFile,
  getOldRenamedTitles,
} from "../utils/utils";

export interface Note {
  title: string;
  body: string;
  tags: string[];
  is_draft: boolean;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  name: string;
  color: string;
}

export const sortArr = ["created", "updated", "alphabetical", "tags"] as const;

export type Sort = (typeof sortArr)[number];

const notes = atomWithReset<Note[]>(getInitialValuesFromFile(TODO_FILE_PATH) as Note[]);
export const notesAtom = atom(
  async (get) => get(notes),
  async (get, set, newNotes: Note[] | typeof RESET) => {
    if (newNotes === RESET) {
      set(notes, getInitialValuesFromFile(TODO_FILE_PATH) as Note[]);
      return;
    }
    /**
     * Autosave deletion logic
     * - If a note is renamed, delete the old note file as title is the filename
     * - If a note is deleted, delete the note file
     */
    if (preferences.fileLocation) {
      const differentTitles = getOldRenamedTitles(get(notes), newNotes);
      if (differentTitles.length > 0) {
        try {
          await deleteNotesInFolder(preferences.fileLocation, differentTitles);
        } catch (e) {
          console.error(`Error deleting note: ${e}`);
        }
      }
      const deletedNote = getDeletedNote(get(notes), newNotes);
      if (deletedNote) {
        try {
          await deleteNotesInFolder(preferences.fileLocation, [deletedNote.title]);
        } catch (e) {
          console.error(`Error deleting note: ${e}`);
        }
      }
    }

    // Update the notes
    set(notes, newNotes);

    // Write notes to JSON data
    fs.writeFileSync(TODO_FILE_PATH, JSON.stringify(newNotes, null, 2));

    // Write notes to file system if autosave is enabled
    if (preferences.fileLocation) {
      try {
        await exportNotes(preferences.fileLocation, newNotes);
      } catch (e) {
        console.error(`Error exporting notes: ${e}`);
      }
    }
  },
);

const tags = atom<Tag[]>(getInitialValuesFromFile(TAGS_FILE_PATH) as Tag[]);
export const tagsAtom = atom(
  (get) => get(tags),
  async (get, set, newTags: Tag[]) => {
    // If a tag is deleted, remove it across all notes
    const deletedTags = getDeletedTags(get(tags), newTags);
    if (deletedTags.length > 0) {
      const notesQ = get(notes);
      const newNotes = notesQ.map((note) => {
        return {
          ...note,
          tags: note.tags.filter((tag) => !deletedTags.some((t) => t.name === tag)),
        };
      });

      // Update the notes
      set(notes, newNotes);
      fs.writeFileSync(TODO_FILE_PATH, JSON.stringify(newNotes, null, 2));
      if (preferences.fileLocation) {
        try {
          await exportNotes(preferences.fileLocation, newNotes);
        } catch (e) {
          console.error(`Error exporting notes: ${e}`);
        }
      }
    }

    set(tags, newTags);

    // Write updated notes to the file
    fs.writeFileSync(TAGS_FILE_PATH, JSON.stringify(newTags, null, 2));
  },
);
