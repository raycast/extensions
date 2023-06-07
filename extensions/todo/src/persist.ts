import { Todo } from "./todo";
import { randomUUID } from "crypto";
import { LocalStorage } from "@raycast/api";
import { IQU_STORAGE_KEY, IQU_STORAGE_KEY_DONE } from "./constants";

function load_todo(todo: Todo): Todo {
  return {
    ...todo,
    id: todo.id || randomUUID(),
    title: todo.title || "[Title not found]"
  };
}

export async function load_todos(): Promise<[Todo[], Todo[]]> {
  const [todos, dones] = await Promise.all([
    LocalStorage.getItem(IQU_STORAGE_KEY),
    LocalStorage.getItem(IQU_STORAGE_KEY_DONE)
  ]);
  return [
    JSON.parse(todos as string ?? "[]").map(load_todo),
    JSON.parse(dones as string ?? "[]").map(load_todo)
  ];
}

export async function store_todos(todos: Todo[]): Promise<void> {
  await LocalStorage.setItem(IQU_STORAGE_KEY, JSON.stringify(todos));
}

export async function store_dones(dones: Todo[]): Promise<void> {
  await LocalStorage.setItem(IQU_STORAGE_KEY_DONE, JSON.stringify(dones));
}
