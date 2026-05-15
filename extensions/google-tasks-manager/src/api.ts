import { getAccessToken } from "@raycast/utils";
import { Task, TaskForm, TaskList } from "./types";

const BASE_URL = "https://tasks.googleapis.com/tasks/v1";

async function authHeaders() {
  const { token } = getAccessToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchTaskLists(): Promise<TaskList[]> {
  const response = await fetch(`${BASE_URL}/users/@me/lists`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch task lists: ${response.statusText}`);
  }
  const json = (await response.json()) as { items?: TaskList[] };
  return (json.items ?? []).map((item) => ({ id: item.id, title: item.title }));
}

export async function fetchTasks(
  listId: string,
  showCompleted = false,
): Promise<Task[]> {
  const params = new URLSearchParams({
    showHidden: "true",
    maxResults: "100",
    showCompleted: showCompleted ? "true" : "false",
  });

  const response = await fetch(`${BASE_URL}/lists/${listId}/tasks?${params}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch tasks: ${response.statusText}`);
  }
  const json = (await response.json()) as { items?: Task[] };
  const tasks = (json.items ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    due: item.due,
    completed: item.completed,
    parent: item.parent,
    notes: item.notes,
  }));

  return tasks.sort((a, b) => {
    if (a.status === "completed" && b.status === "completed") {
      const ca = a.completed ? new Date(a.completed).getTime() : 0;
      const cb = b.completed ? new Date(b.completed).getTime() : 0;
      return cb - ca;
    }

    const da = a.due ? new Date(a.due).getTime() : null;
    const db = b.due ? new Date(b.due).getTime() : null;

    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return 0;
  });
}

function serializeDueDate(due: Date | null | undefined): string | undefined {
  if (!due || !(due instanceof Date)) return undefined;
  const year = due.getFullYear();
  const month = String(due.getMonth() + 1).padStart(2, "0");
  const day = String(due.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

export async function createTask(
  listId: string,
  task: TaskForm,
): Promise<void> {
  const body = {
    title: task.title,
    notes: task.notes || undefined,
    due: serializeDueDate(task.due),
  };

  const response = await fetch(`${BASE_URL}/lists/${listId}/tasks`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to create task: ${response.statusText}`);
  }
}

export async function toggleTask(listId: string, task: Task): Promise<void> {
  const newStatus = task.status === "completed" ? "needsAction" : "completed";

  const response = await fetch(`${BASE_URL}/lists/${listId}/tasks/${task.id}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify({ status: newStatus }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update task: ${response.statusText}`);
  }
}

export async function editTask(
  listId: string,
  taskId: string,
  updates: { title: string; notes?: string; due?: Date | null },
): Promise<void> {
  const body: Record<string, string | null | undefined> = {
    title: updates.title,
    notes: updates.notes !== undefined ? updates.notes || null : undefined,
    due: serializeDueDate(updates.due),
  };

  const response = await fetch(`${BASE_URL}/lists/${listId}/tasks/${taskId}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to edit task: ${response.statusText}`);
  }
}

export async function deleteTask(
  listId: string,
  taskId: string,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/lists/${listId}/tasks/${taskId}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to delete task: ${response.statusText}`);
  }
}
