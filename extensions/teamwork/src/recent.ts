import { LocalStorage } from "@raycast/api";
import type { TeamworkTask } from "./types";

const KEY = "recent-teamwork-tasks";
const STARRED_KEY = "starred-teamwork-tasks";
const MAX_RECENTS = 20;
const MAX_STARRED = 50;

export async function getRecentTasks(): Promise<TeamworkTask[]> {
  const value = await LocalStorage.getItem<string>(KEY);
  if (!value) return [];
  try {
    return JSON.parse(value) as TeamworkTask[];
  } catch {
    return [];
  }
}

export async function addRecentTask(task: TeamworkTask): Promise<void> {
  const current = await getRecentTasks();
  const next = [task, ...current.filter((item) => item.id !== task.id)].slice(
    0,
    MAX_RECENTS,
  );
  await LocalStorage.setItem(KEY, JSON.stringify(next));
}

export async function updateRecentTask(task: TeamworkTask): Promise<void> {
  const current = await getRecentTasks();
  const next = current.map((item) => (item.id === task.id ? task : item));
  await LocalStorage.setItem(KEY, JSON.stringify(next));
}

export async function removeRecentTask(taskId: number): Promise<void> {
  const current = await getRecentTasks();
  await LocalStorage.setItem(
    KEY,
    JSON.stringify(current.filter((item) => item.id !== taskId)),
  );
}

export async function getStarredTasks(): Promise<TeamworkTask[]> {
  const value = await LocalStorage.getItem<string>(STARRED_KEY);
  if (!value) return [];
  try {
    return JSON.parse(value) as TeamworkTask[];
  } catch {
    return [];
  }
}

export async function addStarredTask(task: TeamworkTask): Promise<void> {
  const current = await getStarredTasks();
  const next = [task, ...current.filter((item) => item.id !== task.id)].slice(
    0,
    MAX_STARRED,
  );
  await LocalStorage.setItem(STARRED_KEY, JSON.stringify(next));
}

export async function removeStarredTask(taskId: number): Promise<void> {
  const current = await getStarredTasks();
  await LocalStorage.setItem(
    STARRED_KEY,
    JSON.stringify(current.filter((item) => item.id !== taskId)),
  );
}

export async function updateStarredTask(task: TeamworkTask): Promise<void> {
  const current = await getStarredTasks();
  const next = current.map((item) => (item.id === task.id ? task : item));
  await LocalStorage.setItem(STARRED_KEY, JSON.stringify(next));
}
