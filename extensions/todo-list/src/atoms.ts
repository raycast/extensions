import { atom } from "jotai";
import { DEFAULT_SECTIONS, TODO_FILE } from "./config";
import fs from "fs";
import _ from "lodash";

export interface TodoSections {
  pinned: TodoItem[];
  todo: TodoItem[];
  completed: TodoItem[];
}

export interface TodoItem {
  title: string;
  completed: boolean;
  timeAdded: number;
}

const todo = atom<TodoSections>(_.cloneDeep(DEFAULT_SECTIONS));
export const todoAtom = atom(
  (get) => get(todo),
  (_get, set, newTodo: TodoSections) => {
    set(todo, newTodo);
    fs.writeFileSync(TODO_FILE, JSON.stringify(newTodo));
  }
);

export const searchModeAtom = atom(false);
