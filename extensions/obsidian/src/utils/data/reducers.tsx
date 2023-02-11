import { deleteNoteFromCache, updateNoteInCache } from "./cache";
import { Note, Vault } from "../interfaces";
import { deleteNote, getNoteFileContent, starNote, unstarNote } from "../utils";
import { tagsForNotes } from "../yaml";

export enum NoteReducerActionType {
  Set,
  Delete,
  Star,
  Unstar,
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
      type: NoteReducerActionType.Star;
      payload: {
        note: Note;
        vault: Vault;
      };
    }
  | {
      type: NoteReducerActionType.Unstar;
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
      deleteNote(action.payload.note);
      deleteNoteFromCache(action.payload.vault, action.payload.note);
      return notes.filter((note) => note.path !== action.payload.note.path);
    }

    case NoteReducerActionType.Star: {
      console.log("REDUCER STAR");
      starNote(action.payload.vault, action.payload.note);
      return notes.map((note) => {
        if (note.path === action.payload.note.path) {
          note.starred = true;
          updateNoteInCache(action.payload.vault, note);
        }
        return note;
      });
    }
    case NoteReducerActionType.Unstar: {
      console.log("REDUCER UNSTAR");
      unstarNote(action.payload.vault, action.payload.note);
      return notes.map((note) => {
        if (note.path === action.payload.note.path) {
          note.starred = false;
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
