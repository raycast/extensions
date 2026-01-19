import { LocalStorage } from "@raycast/api";

import { Worklog } from "@/types";

const WORKLOGS_KEY = "jira-worklogs-local";

export async function getWorklogs(): Promise<Worklog[]> {
  const data = await LocalStorage.getItem<string>(WORKLOGS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveWorklog(worklog: Worklog): Promise<void> {
  const current = await getWorklogs();

  // Prevent multiple in-progress worklogs
  if (!worklog.endTime) {
    const existingInProgress = current.find((w) => !w.endTime && w.id !== worklog.id);
    if (existingInProgress) {
      throw new Error(`Another worklog for "${existingInProgress.taskId}" is already in progress.`);
    }
  }

  // Check if exists to update
  const index = current.findIndex((w) => w.id === worklog.id);
  if (index >= 0) {
    current[index] = worklog;
  } else {
    current.push(worklog);
  }
  await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify(current));
}

export async function deleteWorklog(id: string): Promise<void> {
  const current = await getWorklogs();
  const updated = current.filter((w) => w.id !== id);
  await LocalStorage.setItem(WORKLOGS_KEY, JSON.stringify(updated));
}

export async function clearWorklogs(): Promise<void> {
  await LocalStorage.removeItem(WORKLOGS_KEY);
}
