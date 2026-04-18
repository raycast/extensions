import { requestJson, requestPaginatedArray } from "./client";

import type {
  CreateTaskInput,
  Label,
  LabelTaskBulk,
  MessageResponse,
  Project,
  Task,
  TaskListOptions,
  TaskWritePayload,
  UserWithSettings,
  VikunjaInfo,
} from "../types/vikunja";

function normalizeOptionalDate(date?: string | null) {
  if (!date || date.startsWith("0001-01-01T00:00:00")) {
    return undefined;
  }

  return date;
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    done_at: normalizeOptionalDate(task.done_at),
    due_date: normalizeOptionalDate(task.due_date),
    end_date: normalizeOptionalDate(task.end_date),
    start_date: normalizeOptionalDate(task.start_date),
  };
}

export function taskToWritePayload(task: Task): TaskWritePayload {
  return {
    assignees: task.assignees,
    bucket_id: task.bucket_id,
    description: task.description,
    done: task.done,
    due_date: task.due_date,
    end_date: task.end_date,
    hex_color: task.hex_color,
    percent_done: task.percent_done,
    priority: task.priority,
    project_id: task.project_id,
    reminders: task.reminders,
    repeat_after: task.repeat_after,
    repeat_mode: task.repeat_mode,
    start_date: task.start_date,
    title: task.title,
  };
}

export async function getCurrentUser() {
  return requestJson<UserWithSettings>("/user");
}

export async function getServiceInfo() {
  return requestJson<VikunjaInfo>("/info");
}

export async function getProjects(searchText?: string) {
  return requestPaginatedArray<Project>("/projects", {
    expand: "permissions",
    s: searchText,
  });
}

export async function getTasks(options: TaskListOptions = {}) {
  const tasks = await requestPaginatedArray<Task>("/tasks", {
    order_by: options.orderBy ?? "asc",
    s: options.searchText,
    sort_by: options.sortBy ?? ["due_date", "priority", "id"],
  });

  return tasks.map(normalizeTask);
}

export async function getTask(taskId: number) {
  const task = await requestJson<Task>(`/tasks/${taskId}`);
  return normalizeTask(task);
}

export async function createTask(projectId: number, task: CreateTaskInput) {
  const createdTask = await requestJson<Task>(`/projects/${projectId}/tasks`, {
    body: task,
    method: "PUT",
  });

  return normalizeTask(createdTask);
}

export async function updateTask(taskId: number, task: TaskWritePayload) {
  const updatedTask = await requestJson<Task>(`/tasks/${taskId}`, {
    body: task,
    method: "POST",
  });

  return normalizeTask(updatedTask);
}

export async function patchTask(
  taskId: number,
  patch: Partial<TaskWritePayload>,
) {
  const currentTask = await getTask(taskId);

  return updateTask(taskId, {
    ...taskToWritePayload(currentTask),
    ...patch,
  });
}

export async function deleteTask(taskId: number) {
  return requestJson<MessageResponse>(`/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function getLabels(searchText?: string) {
  return requestPaginatedArray<Label>("/labels", {
    s: searchText,
  });
}

export async function updateTaskLabels(taskId: number, labels: Label[]) {
  const payload: LabelTaskBulk = { labels };

  return requestJson<LabelTaskBulk>(`/tasks/${taskId}/labels/bulk`, {
    body: payload,
    method: "POST",
  });
}
