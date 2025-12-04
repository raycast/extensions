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

export async function createTask(tasklist: string, task: TaskForm): Promise<void> {
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks`, {
    method: "POST",
    body: JSON.stringify(task),
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
  const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${tasklist}/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify(task),
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
