import { LocalStorage } from "@raycast/api";

import type { CachedTaskPayload, ExtensionPreferences } from "./types";

const ACTIVE_TASK_ID_KEY = "activeTaskId";
const TASK_CACHE_PREFIX = "taskCache";

export async function getActiveTaskId(): Promise<string | undefined> {
  const value = await LocalStorage.getItem<string>(ACTIVE_TASK_ID_KEY);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function setActiveTaskId(taskId: string): Promise<void> {
  await LocalStorage.setItem(ACTIVE_TASK_ID_KEY, taskId);
}

export function buildTaskCacheKey(preferences: ExtensionPreferences): string {
  const viewScope = preferences.viewIdOrUrl.trim().toLowerCase();
  const closedScope = preferences.showClosedTasks ? "closed" : "open";

  return [TASK_CACHE_PREFIX, preferences.teamId.trim(), closedScope, viewScope].join(":");
}

export async function getCachedTaskPayload(cacheKey: string): Promise<CachedTaskPayload | undefined> {
  const rawValue = await LocalStorage.getItem<string>(cacheKey);

  if (typeof rawValue !== "string" || rawValue.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue) as CachedTaskPayload;
  } catch {
    return undefined;
  }
}

export async function setCachedTaskPayload(cacheKey: string, payload: CachedTaskPayload): Promise<void> {
  await LocalStorage.setItem(cacheKey, JSON.stringify(payload));
}
