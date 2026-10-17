import { atom } from "jotai";
import { showToast, Toast } from "@raycast/api";
import { TODO_FILE } from "./config";
import { readTodos, TodoRevisionConflictError, writeTodos } from "./storage";
import type { TodoSections } from "./types";
export type { TodoItem, TodoSections } from "./types";

const initial = readTodos(TODO_FILE);
let revision = initial.revision;
const todo = atom<TodoSections>(initial.sections);
export const todoAtom = atom(
  (get) => get(todo),
  (_get, set, newTodo: TodoSections) => {
    try {
      revision = writeTodos(TODO_FILE, newTodo, revision);
      set(todo, newTodo);
    } catch (error) {
      if (error instanceof TodoRevisionConflictError) {
        revision = error.revision;
        set(todo, error.sections);
        set(editingAtom, false);
        set(editingTagAtom, false);
        set(editingDueDateAtom, false);
      }
      void showToast({ style: Toast.Style.Failure, title: "Could Not Save Todos", message: String(error) });
      throw error;
    }
  },
);

export const searchModeAtom = atom(false);

export const searchBarTextAtom = atom("");
export const newTodoTextAtom = atom((get) => get(searchBarTextAtom).trim());
export const editingTagNameAtom = atom("");
export const editingDueDateValueAtom = atom(0);
export const editingAtom = atom<
  | false
  | {
      sectionKey: keyof TodoSections;
      index: number;
    }
>(false);
export const editingTagAtom = atom<
  | false
  | {
      sectionKey: keyof TodoSections;
      index: number;
    }
>(false);
export const editingDueDateAtom = atom<
  | false
  | {
      sectionKey: keyof TodoSections;
      index: number;
    }
>(false);

export const ALL_TAG_VALUE = "";
export const selectedTagAtom = atom(ALL_TAG_VALUE);
