import { atom } from "jotai";
import { DEFAULT_SECTIONS, TODO_FILE } from "./config";
import fs from "fs";
import _ from "lodash";
import { environment } from "@raycast/api";

export interface TodoSections {
  pinned: TodoItem[];
  todo: TodoItem[];
  completed: TodoItem[];
}

export interface TodoItem {
  title: string;
  tag?: string;
  dueDate?: number;
  completed: boolean;
  priority?: 1 | 2 | 3;
  timeAdded: number;
}

const getInitialValue = () => {
  try {
    const storedItemsBuffer = fs.readFileSync(TODO_FILE);
    const storedItems = JSON.parse(storedItemsBuffer.toString());
    // from v1 where items were stored in an array
    if (Array.isArray(storedItems)) {
      const storedPinned = storedItems[0];
      const storedTodo = [];
      const storedCompleted = [];
      for (const todo of storedItems[1]) {
        if (todo.completed) {
          storedCompleted.push(todo);
        } else {
          storedTodo.push(todo);
        }
      }

      return {
        pinned: storedPinned,
        todo: storedTodo,
        completed: storedCompleted,
      };
    } else {
      return storedItems;
    }
  } catch (error) {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    return _.cloneDeep(DEFAULT_SECTIONS);
  }
};

const todo = atom<TodoSections>(getInitialValue());
export const todoAtom = atom(
  (get) => get(todo),
  (_get, set, newTodo: TodoSections) => {
    // @ts-expect-error Jotai is confused
    set(todo, newTodo);
    fs.writeFileSync(TODO_FILE, JSON.stringify(newTodo));
  }
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

export const selectedTagAtom = atom("All");
