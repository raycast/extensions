import {
  deleteNoteFromCache,
  updateNoteInCache,
} from "../api/cache/cache.service";
import {
  bookmarkNote,
  unbookmarkNote,
} from "../api/vault/notes/bookmarks/bookmarks.service";
import { deleteNote } from "../api/vault/notes/notes.service";
import { Note } from "../api/vault/notes/notes.types";
import { getNoteFileContent } from "../api/vault/vault.service";
import { Vault } from "../api/vault/vault.types";
import { tagsForNotes } from "./yaml";

export enum NoteReducerActionType {
  Set,
  Delete,
  Bookmark,
  Unbookmark,
  Update,
  Add,
}

export type NoteReducerAction =
  | {
      type: NoteReducerActionType.Set;
      payload: Note[];
    }
  | {
      type: NoteReducerActionType.Delete;
      payload: {
        note: Note;
        vault: Vault;
      };
    }
  | {
      type: NoteReducerActionType.Bookmark;
      payload: {
        note: Note;
        vault: Vault;
      };
    }
  | {
      type: NoteReducerActionType.Unbookmark;
      payload: {
        note: Note;
        vault: Vault;
      };
    }
  | {
      type: NoteReducerActionType.Update;
      payload: {
        note: Note;
        vault: Vault;
      };
    }
  | {
      type: NoteReducerActionType.Add;
      payload: {
        note: Note;
        vault: Vault;
      };
    };

export function NoteReducer(notes: Note[], action: NoteReducerAction) {
  switch (action.type) {
    case NoteReducerActionType.Set: {
      return action.payload;
    }

    case NoteReducerActionType.Delete: {
      const filteredNotes = notes.filter(
        (note) => note.path !== action.payload.note.path
      );

      deleteNote(action.payload.note);
      deleteNoteFromCache(action.payload.vault, action.payload.note);

      return filteredNotes;
    }

    case NoteReducerActionType.Bookmark: {
      bookmarkNote(action.payload.vault, action.payload.note);
      return notes.map((note) => {
        if (note.path === action.payload.note.path) {
          // Create new object instead of mutating
          const updatedNote = { ...note, bookmarked: true };
          updateNoteInCache(action.payload.vault, updatedNote);
          return updatedNote;
        }
        return note;
      });
    }
    case NoteReducerActionType.Unbookmark: {
      unbookmarkNote(action.payload.vault, action.payload.note);
      return notes.map((note) => {
        if (note.path === action.payload.note.path) {
          // Create new object instead of mutating
          const updatedNote = { ...note, bookmarked: false };
          updateNoteInCache(action.payload.vault, updatedNote);
          return updatedNote;
        }
        return note;
      });
    }

    case NoteReducerActionType.Update: {
      const newContent = getNoteFileContent(action.payload.note.path);
      const newTags = tagsForNotes([
        { ...action.payload.note, content: newContent },
      ]);
      // Create new note object with updated fields
      const updatedNote = {
        ...action.payload.note,
        content: newContent,
        tags: newTags,
      };
      updateNoteInCache(action.payload.vault, updatedNote);
      return notes.map((note) => {
        if (note.path === action.payload.note.path) {
          return updatedNote;
        }
        return note;
      });
    }
    case NoteReducerActionType.Add: {
      updateNoteInCache(action.payload.vault, action.payload.note);
      return [...notes, action.payload.note];
    }
    default: {
      return notes;
    }
  }
}
