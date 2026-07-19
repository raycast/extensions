import { apiGet, apiPost, apiDelete } from "./client";
import { Task, CreateTaskPayload, UpdateTaskPayload, Project, Filter } from "../types/ticktick";
import { formatTickTickTime } from "../utils/time";

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function getTask(projectId: string, taskId: string): Promise<Task> {
  return apiGet<Task>(`/open/v1/project/${projectId}/task/${taskId}`);
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  return apiPost<Task>("/open/v1/task", payload);
}

export async function updateTask(payload: UpdateTaskPayload): Promise<Task> {
  return apiPost<Task>(`/open/v1/task/${payload.id}`, payload);
}

export async function completeTask(projectId: string, taskId: string): Promise<void> {
  await apiPost(`/open/v1/project/${projectId}/task/${taskId}/complete`);
}

export async function uncompleteTask(task: Task): Promise<void> {
  await updateTask({ id: task.id, projectId: task.projectId, status: 0 });
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await apiDelete(`/open/v1/project/${projectId}/task/${taskId}`);
}

export async function moveTask(fromProjectId: string, toProjectId: string, taskId: string): Promise<void> {
  try {
    await apiPost("/open/v1/task/move", { fromProjectId, toProjectId, taskId }, { wipeTokenOn401: false });
    return;
  } catch {
    // V2 fallback
  }
  await apiPost("/api/v2/batch/taskProject", {
    move: [{ taskId, fromProjectId, toProjectId }],
  });
}

export async function getCompletedTasks(from: Date, to: Date): Promise<Task[]> {
  try {
    const result = await apiPost<{ tasks?: Task[] }>(
      "/open/v1/task/completed",
      {
        from: formatTickTickTime(from),
        to: formatTickTickTime(to),
      },
      { wipeTokenOn401: false },
    );
    return result?.tasks ?? [];
  } catch {
    // V2 fallback
    const fromMs = from.getTime();
    const toMs = to.getTime();
    const result = await apiGet<Task[]>(`/api/v2/project/all/completedInAll/?from=${fromMs}&to=${toMs}`);
    return result ?? [];
  }
}

export async function filterTasks(rule: string): Promise<Task[]> {
  try {
    const result = await apiPost<{ tasks?: Task[] }>("/open/v1/task/filter", { rule }, { wipeTokenOn401: false });
    return result?.tasks ?? [];
  } catch {
    return [];
  }
}

export async function toggleSubtask(task: Task, subtaskId: string, completed: boolean): Promise<Task> {
  const items = (task.items ?? []).map((item) =>
    item.id === subtaskId ? { ...item, status: completed ? (2 as const) : (0 as const) } : item,
  );
  return updateTask({ id: task.id, projectId: task.projectId, items });
}

export function formatDueDateForApi(date: Date, allDay = true): string {
  if (allDay) {
    // Anchor to LOCAL midnight of the picked day, formatted with the local offset, so the
    // task lands on the intended calendar date. Stamping a literal +0000 offset would shift
    // the date a day earlier for users in negative-UTC timezones.
    const midnight = new Date(date);
    midnight.setHours(0, 0, 0, 0);
    return formatTickTickTime(midnight);
  }
  return formatTickTickTime(date);
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProject(projectId: string): Promise<Project> {
  return apiGet<Project>(`/open/v1/project/${projectId}`);
}

export async function createProject(name: string, color?: string): Promise<Project> {
  try {
    return await apiPost<Project>("/open/v1/project", { name, color: color ?? "#4A90E2" });
  } catch {
    const result = await apiPost<{ add?: Project[] }>("/api/v2/batch/project", {
      add: [{ name, color: color ?? "#4A90E2" }],
    });
    const created = result?.add?.[0];
    if (!created) throw new Error("Failed to create project");
    return created;
  }
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
  try {
    return await apiPost<Project>(`/open/v1/project/${projectId}`, updates);
  } catch {
    await apiPost("/api/v2/batch/project", { update: [{ id: projectId, ...updates }] });
    return getProject(projectId);
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  try {
    await apiDelete(`/open/v1/project/${projectId}`);
  } catch {
    await apiDelete(`/api/v2/project/${projectId}`);
  }
}

// ─── Filters ───────────────────────────────────────────────────────────────

export async function getFilters(): Promise<Filter[]> {
  try {
    const sync = await apiGet<{ filters?: Filter[] }>("/api/v2/batch/check/0");
    return sync?.filters ?? [];
  } catch {
    return [];
  }
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  title: string;
  createdTime?: string;
  modifiedTime?: string;
}

export async function getComments(projectId: string, taskId: string): Promise<Comment[]> {
  try {
    return await apiGet<Comment[]>(`/open/v1/project/${projectId}/task/${taskId}/comments`, {
      wipeTokenOn401: false,
    });
  } catch {
    try {
      return await apiGet<Comment[]>(`/api/v2/project/${projectId}/task/${taskId}/comments`);
    } catch {
      return [];
    }
  }
}

export async function addComment(projectId: string, taskId: string, title: string): Promise<Comment> {
  try {
    return await apiPost<Comment>(
      `/open/v1/project/${projectId}/task/${taskId}/comment`,
      { title },
      { wipeTokenOn401: false },
    );
  } catch {
    return apiPost<Comment>(`/api/v2/project/${projectId}/task/${taskId}/comment`, { title });
  }
}

export async function deleteComment(projectId: string, taskId: string, commentId: string): Promise<void> {
  try {
    await apiDelete(`/open/v1/project/${projectId}/task/${taskId}/comment/${commentId}`, { wipeTokenOn401: false });
  } catch {
    await apiDelete(`/api/v2/project/${projectId}/task/${taskId}/comment/${commentId}`);
  }
}

// ─── User & Stats ────────────────────────────────────────────────────────────

export interface UserProfile {
  name?: string;
  email?: string;
  pro?: boolean;
  proStartDate?: string;
  proEndDate?: string;
}

export interface UserStats {
  score?: number;
  level?: number;
  completedTasks?: number;
  pomoCount?: number;
  pomoDuration?: number;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    return await apiGet<UserProfile>("/api/v2/user/profile");
  } catch {
    return null;
  }
}

export async function getUserStats(): Promise<UserStats | null> {
  try {
    return await apiGet<UserStats>("/api/v2/statistics/general");
  } catch {
    return null;
  }
}
