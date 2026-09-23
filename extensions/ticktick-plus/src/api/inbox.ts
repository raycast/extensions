import { LocalStorage } from "@raycast/api";
import { apiGet } from "./client";
import { Project, Task } from "../types/ticktick";

const INBOX_STORAGE_KEY = "ticktick_inbox_id";
const INBOX_ID_PATTERN = /^inbox\d+$/i;

interface V1ProjectData {
  project: Project;
  tasks: Task[];
}

export function isInboxProjectId(id: string): boolean {
  return INBOX_ID_PATTERN.test(id);
}

export async function getStoredInboxId(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(INBOX_STORAGE_KEY)) ?? null;
}

export async function setStoredInboxId(inboxId: string): Promise<void> {
  if (inboxId) {
    await LocalStorage.setItem(INBOX_STORAGE_KEY, inboxId);
  }
}

export async function clearStoredInboxId(): Promise<void> {
  await LocalStorage.removeItem(INBOX_STORAGE_KEY);
}

/** Resolve inbox ID from project list, task data, cache, or the inbox shortcut endpoint. */
export async function resolveInboxId(projects: Project[], tasks: Task[]): Promise<string> {
  // 1. kind field
  const byKind = projects.find((p) => (p.kind ?? "").toUpperCase() === "INBOX");
  if (byKind) return byKind.id;

  // 2. ID pattern (e.g. inbox131039472) — most reliable for OAuth V1
  const byId = projects.find((p) => isInboxProjectId(p.id));
  if (byId) return byId.id;

  // 3. Exact name match
  const byName = projects.find((p) => p.name.toLowerCase() === "inbox");
  if (byName) return byName.id;

  // 4. Orphan task projectIds matching inbox pattern
  const knownIds = new Set(projects.map((p) => p.id));
  for (const task of tasks) {
    if (task.projectId && !knownIds.has(task.projectId) && isInboxProjectId(task.projectId)) {
      return task.projectId;
    }
  }

  // 5. Inbox shortcut endpoint — inbox is often absent from GET /open/v1/project
  try {
    const inboxData = await apiGet<V1ProjectData>("/open/v1/project/inbox/data");
    if (inboxData.project?.id) return inboxData.project.id;
    if (tasks.length === 0 && inboxData.tasks?.[0]?.projectId && isInboxProjectId(inboxData.tasks[0].projectId)) {
      return inboxData.tasks[0].projectId;
    }
  } catch {
    // endpoint unavailable — continue to cache fallback
  }

  // 6. Any orphan projectId (inbox not in project list, non-standard ID)
  for (const task of tasks) {
    if (task.projectId && !knownIds.has(task.projectId)) {
      return task.projectId;
    }
  }

  // 7. Cached value from a previous successful sync
  const cached = await getStoredInboxId();
  if (cached) return cached;

  return "";
}

export async function fetchInboxTasks(inboxId: string): Promise<{ project: Project | null; tasks: Task[] }> {
  // Prefer the documented shortcut — works even when inbox isn't in the project list
  try {
    const inboxData = await apiGet<V1ProjectData>("/open/v1/project/inbox/data");
    return { project: inboxData.project ?? null, tasks: inboxData.tasks ?? [] };
  } catch {
    // Fall back to ID-based fetch
  }

  if (!inboxId) return { project: null, tasks: [] };

  try {
    const inboxData = await apiGet<V1ProjectData>(`/open/v1/project/${inboxId}/data`);
    return { project: inboxData.project ?? null, tasks: inboxData.tasks ?? [] };
  } catch {
    return { project: null, tasks: [] };
  }
}
