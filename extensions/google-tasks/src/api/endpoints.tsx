import fetch from "node-fetch";
import { Task, TaskForm } from "../types";
import { isCompleted } from "../utils";
import { client } from "./oauth";

// API

export async function fetchLists(): Promise<{ id: string; title: string }[]> {
  const response = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as {
    items: { id: string; title: string }[];
  };
  return json.items.map((item) => ({ id: item.id, title: item.title }));
}

export async function fetchList(tasklist: string, showCompleted = false): Promise<Task[]> {
  const params = new URLSearchParams();
  params.append("showHidden", "true");
  params.append("maxResults", "100");
  if (showCompleted) {
    params.append("showCompleted", "true");
  } else {
    params.append("showCompleted", "false");
  }
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks?` + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as {
    items: Task[];
  };
  const sortedTasks = json.items
    .map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      due: item.due,
      completed: item.completed,
      parent: item.parent,
      notes: item.notes,
    }))
    .sort((a, b) => {
      // First sort completed tasks by completion date (most recent first)
      if (a.status === "completed" && b.status === "completed") {
        const completedDateA = a.completed ? new Date(a.completed) : null;
        const completedDateB = b.completed ? new Date(b.completed) : null;
        return (completedDateB?.getTime() ?? 0) - (completedDateA?.getTime() ?? 0);
      }

      // Then handle non-completed tasks with due dates
      const dueDateA = a.due !== undefined ? new Date(a.due) : null;
      const dueDateB = b.due !== undefined ? new Date(b.due) : null;

      if (dueDateA && dueDateB) {
        return dueDateA.getTime() - dueDateB.getTime();
      } else if (dueDateA) {
        return -1; // A has a due date, B does not. A comes before B.
      } else if (dueDateB) {
        return 1; // B has a due date, A does not. B comes before A.
      } else {
        return 0; // Both A and B do not have due dates. Order remains unchanged.
      }
    });

  return sortedTasks;
}

export async function deleteTask(tasklist: string, id: string): Promise<void> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}

export function formatDueDate(date: Date | null): string | undefined {
  if (!date) return undefined;

  // Raycast DatePicker returns midnight LOCAL time
  // Use local methods to get the correct date
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

// Parse API date string (RFC 3339) to Date at midnight LOCAL time
// This matches what Raycast DatePicker expects
export function parseApiDate(dateString: string): Date {
  const [datePart] = dateString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export async function createTask(tasklist: string, task: TaskForm): Promise<void> {
  const payload = {
    title: task.title,
    notes: task.notes,
    due: formatDueDate(task.due),
  };
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}
export async function editTask(tasklist: string, task: Task): Promise<void> {
  // Handle due date - it might be a Date object from the form or a string
  let formattedDue: string | undefined = undefined;
  if (task.due) {
    // At runtime, due will be a Date from the DatePicker (even though types say string)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dueValue = task.due as any;
    if (dueValue instanceof Date) {
      formattedDue = formatDueDate(dueValue);
    } else if (typeof dueValue === "string") {
      // Already formatted RFC 3339 string, pass through as-is
      formattedDue = dueValue;
    }
  }

  const payload = {
    ...task,
    due: formattedDue,
  };
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}

export async function toggleTask(tasklist: string, task: Task): Promise<void> {
  const payload: { status: string } = { status: "" };
  if (isCompleted(task)) {
    payload["status"] = "needsAction";
  } else {
    payload["status"] = "completed";
  }
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });
  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
}
