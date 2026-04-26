import { LocalStorage } from "@raycast/api";
import { AppData, Category, Todo } from "./types";

const STORAGE_KEY = "todos-app-data";

async function loadData(): Promise<AppData> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return { categories: [], todos: {} };
  }
  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return { categories: [], todos: {} };
  }
}

async function saveData(data: AppData): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getCategories(): Promise<Category[]> {
  const data = await loadData();
  // backwards compat: assign default color to old categories without one
  return data.categories.map((c) => ({ ...c, color: c.color ?? "blue" })).sort((a, b) => a.createdAt - b.createdAt);
}

export async function createCategory(name: string, color: string): Promise<Category> {
  const data = await loadData();
  const category: Category = {
    id: Date.now().toString(),
    name: name.trim(),
    color,
    createdAt: Date.now(),
  };
  data.categories.push(category);
  data.todos[category.id] = [];
  await saveData(data);
  return category;
}

export async function updateCategory(id: string, name: string, color: string): Promise<void> {
  const data = await loadData();
  const cat = data.categories.find((c) => c.id === id);
  if (cat) {
    cat.name = name.trim();
    cat.color = color;
  }
  await saveData(data);
}

export async function deleteCategory(id: string): Promise<void> {
  const data = await loadData();
  data.categories = data.categories.filter((c) => c.id !== id);
  delete data.todos[id];
  await saveData(data);
}

export async function getTodos(categoryId: string): Promise<Todo[]> {
  const data = await loadData();
  return (data.todos[categoryId] ?? []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function createTodo(categoryId: string, title: string): Promise<Todo> {
  const data = await loadData();
  const todo: Todo = {
    id: Date.now().toString(),
    title: title.trim(),
    completed: false,
    createdAt: Date.now(),
  };
  if (!data.todos[categoryId]) data.todos[categoryId] = [];
  data.todos[categoryId].push(todo);
  await saveData(data);
  return todo;
}

export async function toggleTodo(categoryId: string, todoId: string): Promise<void> {
  const data = await loadData();
  const todo = data.todos[categoryId]?.find((t) => t.id === todoId);
  if (todo) {
    todo.completed = !todo.completed;
    if (todo.completed) {
      todo.completedAt = Date.now();
    } else {
      todo.completedAt = undefined;
    }
  }
  await saveData(data);
}

export async function deleteTodo(categoryId: string, todoId: string): Promise<void> {
  const data = await loadData();
  if (data.todos[categoryId]) {
    data.todos[categoryId] = data.todos[categoryId].filter((t) => t.id !== todoId);
  }
  await saveData(data);
}

export async function updateTodo(categoryId: string, todoId: string, title: string): Promise<void> {
  const data = await loadData();
  const todo = data.todos[categoryId]?.find((t) => t.id === todoId);
  if (todo) todo.title = title.trim();
  await saveData(data);
}
