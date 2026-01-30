import { LocalStorage } from "@raycast/api";
import { Note, Todo } from "./types";

const STORAGE_KEY = "notes";
const TODOS_KEY = "todos";

export async function getNotes(): Promise<Note[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Note[];
}

export async function saveNote(note: Note): Promise<void> {
  const notes = await getNotes();
  const index = notes.findIndex((n) => n.id === note.id);
  if (index >= 0) {
    notes[index] = note;
  } else {
    notes.unshift(note);
  }
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export async function deleteNote(id: string): Promise<void> {
  const notes = await getNotes();
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(notes.filter((n) => n.id !== id)));
}

export async function getTodos(): Promise<Todo[]> {
  const raw = await LocalStorage.getItem<string>(TODOS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Todo[];
}

async function saveTodos(todos: Todo[]): Promise<void> {
  await LocalStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

export async function addTodo(title: string): Promise<void> {
  const todos = await getTodos();
  todos.unshift({ id: Date.now().toString(), title, isCompleted: false, createdAt: Date.now() });
  await saveTodos(todos);
}

export async function toggleTodo(id: string): Promise<void> {
  const todos = await getTodos();
  const todo = todos.find((t) => t.id === id);
  if (todo) todo.isCompleted = !todo.isCompleted;
  await saveTodos(todos);
}

export async function deleteTodo(id: string): Promise<void> {
  const todos = await getTodos();
  await saveTodos(todos.filter((t) => t.id !== id));
}

export async function deleteCompletedTodos(): Promise<void> {
  const todos = await getTodos();
  await saveTodos(todos.filter((t) => !t.isCompleted));
}
