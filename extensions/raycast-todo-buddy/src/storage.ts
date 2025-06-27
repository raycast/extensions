import {
  changeTagsOfATaskInStorage,
  toggleTaskCompletionInStorage,
  createTagInStorage,
  createTaskInStorage,
  deleteTaskInStorage,
  getAllTagsInStorage,
  getAllTasks,
  renameTaskInStorage,
  updateDueDateInStorage,
  changeDifficultyOfATaskInStorage,
  updateTaskInStorage,
  deleteTagInStorage,
  renameTagInStorage,
  setPinTaskInStorage,
} from "./repository/localStorage";
import { v4 as uuidv4 } from "uuid";
import { Tag, Task } from "./types";

type CreateTaskArgs = {
  text: string;
  difficulty: string;
  date?: string;
  tags?: string[];
};
export function createTask({ text, difficulty, date, tags }: CreateTaskArgs) {
  return createTaskInStorage({
    id: uuidv4(),
    text,
    difficulty,
    date,
    tags: tags ?? [],
    completed: false,
    pinned: false,
  });
}

export async function updateTask(taskId: string, newTask: Omit<Task, "id">) {
  return updateTaskInStorage(taskId, newTask);
}

export async function retrieveAllItems(): Promise<Task[]> {
  return getAllTasks();
}

export async function toggleTaskCompletionStatus(taskId: string) {
  return toggleTaskCompletionInStorage(taskId);
}

export async function deleteTask(taskId: string) {
  return deleteTaskInStorage(taskId);
}

export async function renameTask(taskId: string, text: string) {
  return renameTaskInStorage(taskId, text);
}

export async function updateDueDate(taskId: string, date: Date | undefined) {
  return updateDueDateInStorage(taskId, date?.toLocaleString());
}

export async function getAllTags(): Promise<Tag[]> {
  return getAllTagsInStorage();
}

export async function createTag(tag: Tag) {
  return createTagInStorage(tag);
}

export async function renameTag(tagId: string, name: string) {
  return renameTagInStorage(tagId, name);
}

export async function updateTags(taskId: string, tags: string[]) {
  return changeTagsOfATaskInStorage(taskId, tags);
}

export async function deleteTag(tagId: string) {
  // If the tag is used by any task, don't delete it
  const tasks = await getAllTasks();
  const isUsed = tasks.some((task) => task.tags.includes(tagId));
  if (isUsed) {
    const tagName = (await getAllTags()).find((tag) => tag.id === tagId)?.name;
    throw new Error(`Tag ${tagName} is used by one or more tasks`);
  }
  return deleteTagInStorage(tagId);
}

export async function updateLevel(taskId: string, level: string) {
  return changeDifficultyOfATaskInStorage(taskId, level);
}

export async function pinTask(taskId: string) {
  return setPinTaskInStorage(taskId, true);
}

export async function unpinTask(taskId: string) {
  return setPinTaskInStorage(taskId, false);
}
