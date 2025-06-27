import { LocalStorage } from "@raycast/api";
import { Tag, Task } from "../types";

export async function getAllTasks(): Promise<Task[]> {
  const rawTasks = await LocalStorage.getItem<string>("tasks");
  const tasks = JSON.parse(rawTasks ?? "[]");
  return tasks;
}

export async function createTaskInStorage(task: Task) {
  const tasks = await getAllTasks();
  tasks.push(task);
  await LocalStorage.setItem("tasks", JSON.stringify(tasks));
}

export async function updateTaskInStorage(taskId: string, newTask: Omit<Task, "id">) {
  const tasks = await getAllTasks();
  const updatedTasks = tasks.map((t) => (t.id === taskId ? { ...t, ...newTask } : t));
  await LocalStorage.setItem("tasks", JSON.stringify(updatedTasks));
}

export async function toggleTaskCompletionInStorage(taskId: string) {
  const tasks = await getAllTasks();
  const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task));
  await LocalStorage.setItem("tasks", JSON.stringify(updatedTasks));
}

export async function deleteTaskInStorage(taskId: string) {
  const tasks = await getAllTasks();
  const filteredTasks = tasks.filter((task) => task.id !== taskId);
  await LocalStorage.setItem("tasks", JSON.stringify(filteredTasks));
}

export async function renameTaskInStorage(taskId: string, text: string) {
  const tasks = await getAllTasks();
  const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, text } : task));
  await LocalStorage.setItem("tasks", JSON.stringify(updatedTasks));
}

export async function updateDueDateInStorage(taskId: string, date: string | undefined) {
  const tasks = await getAllTasks();
  const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, date } : task));
  await LocalStorage.setItem("tasks", JSON.stringify(updatedTasks));
}

export async function getAllTagsInStorage(): Promise<Tag[]> {
  const rawTags = await LocalStorage.getItem<string>("tags");
  const tags = JSON.parse(rawTags ?? "[]");
  return tags;
}

export async function createTagInStorage(tag: Tag) {
  const tags = await getAllTagsInStorage();
  tags.push(tag);
  await LocalStorage.setItem("tags", JSON.stringify(tags));
}

export async function renameTagInStorage(tagId: string, name: string) {
  const tags = await getAllTagsInStorage();
  const updatedTags = tags.map((tag) => (tag.id === tagId ? { ...tag, name } : tag));
  await LocalStorage.setItem("tags", JSON.stringify(updatedTags));
}

export async function changeTagsOfATaskInStorage(taskId: string, tagIds: string[]) {
  const tasks = await getAllTasks();
  const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, tags: tagIds } : task));
  await LocalStorage.setItem("tasks", JSON.stringify(updatedTasks));
}

export async function deleteTagInStorage(tagId: string) {
  const tags = await getAllTagsInStorage();
  const filteredTags = tags.filter((tag) => tag.id !== tagId);
  await LocalStorage.setItem("tags", JSON.stringify(filteredTags));
}

export async function changeDifficultyOfATaskInStorage(taskId: string, difficulty: string) {
  const tasks = await getAllTasks();
  const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, difficulty } : task));
  await LocalStorage.setItem("tasks", JSON.stringify(updatedTasks));
}

export async function getAllData() {
  return LocalStorage.allItems();
}

export async function importDataFromJson(jsonStr: string) {
  const data = JSON.parse(jsonStr);
  if (data.tasks) {
    const tasks = JSON.parse(data.tasks);
    if (typeof tasks !== "object") {
      throw new Error("tasks is not an object");
    }
    await LocalStorage.setItem("tasks", JSON.stringify(tasks));
  }
  if (data.tags) {
    const tags = JSON.parse(data.tags);
    if (typeof tags !== "object") {
      throw new Error("tags is not an object");
    }
    await LocalStorage.setItem("tags", JSON.stringify(tags));
  }
}

export async function setPinTaskInStorage(taskId: string, pinned: boolean) {
  const tasks = await getAllTasks();
  const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, pinned } : task));
  await LocalStorage.setItem("tasks", JSON.stringify(updatedTasks));
}
