import { deleteNoteFromCache, updateNoteInCache } from "../api/cache/cache.service";
import { bookmarkNote, unbookmarkNote } from "../api/vault/notes/bookmarks/bookmarks.service";
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
      console.log("REDUCER SET");
      return action.payload;
    }

    case NoteReducerActionType.Delete: {
      console.log("REDUCER DELETE");
      const filteredNotes = notes.filter((note) => note.path !== action.payload.note.path);

      deleteNote(action.payload.note);
      deleteNoteFromCache(action.payload.vault, action.payload.note);

      return filteredNotes;
    }

    case NoteReducerActionType.Bookmark: {
      console.log("REDUCER BOOKMARK");
      bookmarkNote(action.payload.vault, action.payload.note);
      return notes.map((note) => {
        if (note.path === action.payload.note.path) {
          note.bookmarked = true;
          updateNoteInCache(action.payload.vault, note);
        }
        return note;
      });
    }
    case NoteReducerActionType.Unbookmark: {
      console.log("REDUCER UNBOOKMARK");
      unbookmarkNote(action.payload.vault, action.payload.note);
      return notes.map((note) => {
        if (note.path === action.payload.note.path) {
          note.bookmarked = false;
          updateNoteInCache(action.payload.vault, note);
        }
        return note;
      });
    }

    case NoteReducerActionType.Update: {
      console.log("REDUCER UPDATE");
      const newContent = getNoteFileContent(action.payload.note.path);
      console.log(newContent);
      action.payload.note.content = newContent;
      const newTags = tagsForNotes([action.payload.note]);
      action.payload.note.tags = newTags;
      updateNoteInCache(action.payload.vault, action.payload.note);
      return notes.map((note) => {
        if (note.path === action.payload.note.path) {
          return action.payload.note;
        }
        return note;
      });
    }
    case NoteReducerActionType.Add: {
      console.log("REDUCER ADD");
      updateNoteInCache(action.payload.vault, action.payload.note);
      return [...notes, action.payload.note];
    }
    default: {
      return notes;
    }
  }
}
