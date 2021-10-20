import { atom } from "jotai";
import { DEFAULT_SECTIONS, TODO_FILE } from "./config";
import fs from "fs";
import _ from "lodash";

export interface TodoItem {
  title: string;
  completed: boolean;
  timeAdded: number;
}

const todo = atom<TodoItem[][]>(_.cloneDeep(DEFAULT_SECTIONS));
export const todoAtom = atom(
  (get) => get(todo),
  (_get, set, newTodo: TodoItem[][]) => {
    set(todo, newTodo);
    fs.writeFileSync(TODO_FILE, JSON.stringify(newTodo));
  }
);
