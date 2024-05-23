import { atom } from "jotai";
import { TAGS_FILE_PATH, TODO_FILE_PATH, preferences } from "./config";
import fs from "fs";
import { compareDesc } from "date-fns";
import {
  deleteNotesInFolder,
  exportNotes,
  getDeletedNote,
  getDeletedTags,
  getInitialMenuToggle,
  getInitialSort,
  getInitialValuesFromFile,
  getOldRenamedTitles,
} from "../utils/utils";
import { LocalStorage } from "@raycast/api";
import slugify from "slugify";

export interface Note {
  title: string;
  body: string;
  tags: string[];
  is_draft: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  name: string;
  color: string;
}

export const sortArr = ["created", "updated", "alphabetical", "tags"] as const;

export type Sort = (typeof sortArr)[number];

const baseSortAtom = atom<Sort>("updated");
export const sortAtom = atom(
  async (get) => {
    const initialSort = await getInitialSort();
    const currentSort = get(baseSortAtom);
    return currentSort === "updated" ? initialSort : currentSort;
  },
  async (get, set, newSort: Sort) => {
    const current = get(baseSortAtom);
    if (current === newSort) {
      return;
    }
    await LocalStorage.setItem("sort", newSort);
    set(baseSortAtom, newSort);
  },
);

const menuToggle = atom(false);
const internalMenuAtom = atom(
  async (get) => {
    const initMenu = await getInitialMenuToggle();
    const currentMenu = get(menuToggle);
    return currentMenu === false ? initMenu : currentMenu;
  },
  async (get, set, newMenu: boolean) => {
    await LocalStorage.setItem("menu", newMenu ? "true" : "false");
    set(menuToggle, newMenu);
  },
);

export const menuAtom = atom(
  async (get) => await get(internalMenuAtom),
  async (get, set) => {
    const current = get(menuToggle);
    const newMenu = !current;
    await LocalStorage.setItem("menu", newMenu ? "true" : "false");
    set(menuToggle, newMenu);
  },
);

const notes = atom<Note[]>(getInitialValuesFromFile(TODO_FILE_PATH) as Note[]);
export const notesAtom = atom(
  async (get) => {
    const notesQ = get(notes);
    const sortQ = get(baseSortAtom);

    // Sort based on user preference
    return notesQ.sort((a, b) => {
      if (sortQ === "created") {
        return compareDesc(a.createdAt, b.createdAt);
      } else if (sortQ === "alphabetical") {
        return slugify(a.title).localeCompare(slugify(b.title));
      }
      return compareDesc(a.updatedAt, b.updatedAt);
    });
  },
  async (get, set, newNotes: Note[]) => {
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
