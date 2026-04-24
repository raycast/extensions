import { LocalStorage } from "@raycast/api";
import type { RecentWorkflowTarget } from "../types/github";

const RECENT_REPOS_KEY = "recent-repositories";
const RECENT_WORKFLOWS_KEY = "recent-workflows";
const MAX_ITEMS = 8;

async function getJson<T>(key: string): Promise<T[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveJson<T>(key: string, value: T[]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(value));
}

export async function getRecentRepositories(): Promise<string[]> {
  return getJson<string>(RECENT_REPOS_KEY);
}

export async function recordRecentRepository(fullName: string): Promise<void> {
  const current = await getRecentRepositories();
  const next = [fullName, ...current.filter((item) => item !== fullName)].slice(0, MAX_ITEMS);
  await saveJson(RECENT_REPOS_KEY, next);
}

export async function getRecentWorkflowTargets(): Promise<RecentWorkflowTarget[]> {
  return getJson<RecentWorkflowTarget>(RECENT_WORKFLOWS_KEY);
}

export async function recordRecentWorkflowTarget(target: RecentWorkflowTarget): Promise<void> {
  const current = await getRecentWorkflowTargets();
  const next = [
    target,
    ...current.filter((item) => !(item.repoFullName === target.repoFullName && item.workflowId === target.workflowId)),
  ].slice(0, MAX_ITEMS);
  await saveJson(RECENT_WORKFLOWS_KEY, next);
}
