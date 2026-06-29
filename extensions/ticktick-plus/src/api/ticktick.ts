import { apiGet, apiPost, apiDelete, apiPut } from "./client";
import { Task, CreateTaskPayload, UpdateTaskPayload, Project, ProjectGroup, Tag, Filter } from "../types/ticktick";
import { formatTickTickTime } from "../utils/time";
import { format } from "date-fns";

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
    await apiPost("/open/v1/task/move", { fromProjectId, toProjectId, taskId });
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
    const result = await apiPost<{ tasks?: Task[] }>("/open/v1/task/completed", {
      from: formatTickTickTime(from),
      to: formatTickTickTime(to),
    });
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
    const result = await apiPost<{ tasks?: Task[] }>("/open/v1/task/filter", { rule });
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
  if (allDay) return format(date, "yyyy-MM-dd'T'00:00:00.000+0000");
  return formatTickTickTime(date);
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  return apiGet<Project[]>("/open/v1/project");
}

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
    return result?.add?.[0] ?? ({ id: "", name } as Project);
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

export async function getProjectGroups(): Promise<ProjectGroup[]> {
  try {
    return await apiGet<ProjectGroup[]>("/open/v1/project/group");
  } catch {
    return [];
  }
}

export async function createProjectGroup(name: string): Promise<ProjectGroup> {
  try {
    return await apiPost<ProjectGroup>("/open/v1/project/group", { name });
  } catch {
    const result = await apiPost<{ add?: ProjectGroup[] }>("/api/v2/batch/projectGroup", {
      add: [{ name }],
    });
    return result?.add?.[0] ?? ({ id: "", name } as ProjectGroup);
  }
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<Tag[]> {
  try {
    return await apiGet<Tag[]>("/open/v1/tag");
  } catch {
    return [];
  }
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  try {
    return await apiPost<Tag>("/open/v1/tag", { name, color });
  } catch {
    await apiPost("/api/v2/batch/tag", { add: [{ name, color }] });
    return { name, color };
  }
}

export async function renameTag(oldName: string, newName: string): Promise<void> {
  try {
    await apiPut("/api/v2/tag/rename", { oldName, newName });
  } catch {
    // no V1 equivalent
  }
}

export async function deleteTag(name: string): Promise<void> {
  try {
    await apiDelete(`/api/v2/tag?name=${encodeURIComponent(name)}`);
  } catch {
    // no V1 equivalent
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

// ─── Templates ─────────────────────────────────────────────────────────────

export interface TaskTemplate {
  id: string;
  title: string;
  content?: string;
  tags?: string[];
  priority?: number;
}

export async function getTemplates(): Promise<TaskTemplate[]> {
  try {
    return await apiGet<TaskTemplate[]>("/api/v2/templates");
  } catch {
    return [];
  }
}

export async function createTaskFromTemplate(templateId: string, projectId: string): Promise<Task> {
  const result = await apiPost<{ task?: Task }>("/api/v2/templates/task", { templateId, projectId });
  if (result?.task) return result.task;
  throw new Error("Failed to create task from template");
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
    return await apiGet<Comment[]>(`/open/v1/project/${projectId}/task/${taskId}/comments`);
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
    return await apiPost<Comment>(`/open/v1/project/${projectId}/task/${taskId}/comment`, { title });
  } catch {
    return apiPost<Comment>(`/api/v2/project/${projectId}/task/${taskId}/comment`, { title });
  }
}

export async function deleteComment(projectId: string, taskId: string, commentId: string): Promise<void> {
  try {
    await apiDelete(`/open/v1/project/${projectId}/task/${taskId}/comment/${commentId}`);
  } catch {
    await apiDelete(`/api/v2/project/${projectId}/task/${taskId}/comment/${commentId}`);
  }
}

// ─── Kanban Columns ──────────────────────────────────────────────────────────

export interface KanbanColumn {
  id: string;
  name: string;
  sortOrder?: number;
  projectId?: string;
}

export async function getColumns(projectId: string): Promise<KanbanColumn[]> {
  try {
    return await apiGet<KanbanColumn[]>(`/open/v1/project/${projectId}/column`);
  } catch {
    try {
      return await apiGet<KanbanColumn[]>(`/api/v2/column/project/${projectId}`);
    } catch {
      return [];
    }
  }
}

export async function createColumn(projectId: string, name: string): Promise<KanbanColumn> {
  try {
    return await apiPost<KanbanColumn>(`/open/v1/project/${projectId}/column`, { name });
  } catch {
    const result = await apiPost<{ add?: KanbanColumn[] }>("/api/v2/column", {
      add: [{ projectId, name }],
    });
    return result?.add?.[0] ?? ({ id: "", name, projectId } as KanbanColumn);
  }
}

export async function moveTaskToColumn(task: Task, columnId: string): Promise<Task> {
  return updateTask({ id: task.id, projectId: task.projectId, columnId });
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

// ─── Trash ───────────────────────────────────────────────────────────────────

export async function getTrashTasks(limit = 50): Promise<Task[]> {
  try {
    const result = await apiGet<{ tasks?: Task[] }>(`/api/v2/project/all/trash/pagination?limit=${limit}`);
    return result?.tasks ?? [];
  } catch {
    return [];
  }
}

export async function restoreFromTrash(taskId: string, projectId: string): Promise<void> {
  await apiPost("/api/v2/batch/task", {
    update: [{ id: taskId, projectId, deleted: 0 }],
  });
}

// ─── Focus Stats ─────────────────────────────────────────────────────────────

export interface FocusStats {
  todayPomoCount?: number;
  todayPomoDuration?: number;
  totalPomoCount?: number;
  totalPomoDuration?: number;
}

export async function getFocusStats(): Promise<FocusStats | null> {
  try {
    return await apiGet<FocusStats>("/api/v2/pomodoros/statistics/generalForDesktop");
  } catch {
    return null;
  }
}
