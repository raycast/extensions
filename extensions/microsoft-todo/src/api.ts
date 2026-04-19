const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export interface TodoTaskList {
  id: string;
  displayName: string;
  isOwner: boolean;
  isShared: boolean;
  wellknownListName: string;
}

export interface TodoTask {
  id: string;
  title: string;
  status: string;
}

interface GraphListResponse<T> {
  value: T[];
}

async function graphRequest<T>(
  accessToken: string,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Graph API error (${path}):`, errorText);
    throw new Error(
      `Microsoft Graph API error: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

export async function getTaskLists(
  accessToken: string,
): Promise<TodoTaskList[]> {
  const result = await graphRequest<GraphListResponse<TodoTaskList>>(
    accessToken,
    "/me/todo/lists",
  );
  return result.value;
}

export async function createTask(
  accessToken: string,
  listId: string,
  title: string,
  isImportant: boolean,
): Promise<TodoTask> {
  return graphRequest<TodoTask>(accessToken, `/me/todo/lists/${listId}/tasks`, {
    method: "POST",
    body: JSON.stringify({
      title,
      importance: isImportant ? "high" : "normal",
    }),
  });
}
