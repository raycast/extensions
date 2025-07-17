import { getValidAccessToken, clearTokens } from "./auth";
import { showToast, Toast } from "@raycast/api";

const BASE_URL = "https://buenote.app";

async function fetchWithRateLimit(
  url: string,
  options: RequestInit = {},
  attempt = 1,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new Error((err as Error).message || "Network error");
  }
  if (res.status === 401) {
    // Token invalid or expired – clear and instruct caller to re-authenticate
    await clearTokens();
    throw new Error("Authentication required – please log in again.");
  }
  if (res.status === 429) {
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
    await showToast({
      style: Toast.Style.Failure,
      title: `Rate limited – retrying in ${delay / 1000}s`,
    });
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRateLimit(url, options, attempt + 1);
  }
  // Attempt to surface server-side error messages
  if (!res.ok) {
    try {
      const data = await res.json();
      if (data && data.error) throw new Error(data.error);
    } catch (_) {
      /* fallthrough – response not JSON */
    }
  }
  return res;
}

export interface TemplateCard {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export async function fetchRecentTemplates(): Promise<TemplateCard[]> {
  const token = await getValidAccessToken();
  const res = await fetchWithRateLimit(
    `${BASE_URL}/templates/recent?limit=10`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`Failed ${res.status}`);
  return res.json();
}

export async function searchTemplates(q: string): Promise<TemplateCard[]> {
  const token = await getValidAccessToken();
  const res = await fetchWithRateLimit(
    `${BASE_URL}/api/templates/search?q=${encodeURIComponent(q)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) throw new Error(`Failed ${res.status}`);
  return res.json();
}

export async function runTemplate(
  id: number,
  inputs: Record<string, string>,
): Promise<{ task_id: string }> {
  const token = await getValidAccessToken();
  const body = JSON.stringify({ inputs });
  console.log("[runTemplate] POST /templates/" + id + "/run", body); // DEBUG
  const res = await fetchWithRateLimit(`${BASE_URL}/templates/${id}/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });
  console.log("[runTemplate] Response status:", res.status); // DEBUG
  let json: unknown = null;
  try {
    json = await res.json();
    console.log("[runTemplate] Response JSON:", json); // DEBUG
  } catch (e) {
    console.log("[runTemplate] Failed to parse JSON:", e); // DEBUG
  }
  if (!res.ok) throw new Error(`Failed ${res.status}`);
  if (!json || typeof json !== "object" || !("task_id" in json)) throw new Error("No task_id in response");
  return json as { task_id: string };
}

export async function pollTask(
  taskId: string,
): Promise<{ task_id?: string; status?: string; result?: unknown; error?: string } | undefined> {
  const token = await getValidAccessToken();
  console.log("[pollTask] GET /tasks/" + taskId); // DEBUG
  const res = await fetchWithRateLimit(`${BASE_URL}/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("[pollTask] Response status:", res.status); // DEBUG
  let json: unknown = null;
  try {
    json = await res.json();
    console.log("[pollTask] Response JSON:", json); // DEBUG
  } catch (e) {
    console.log("[pollTask] Failed to parse JSON:", e); // DEBUG
  }
  if (typeof json === "object" && json !== null && "status" in json) {
    return json as { task_id?: string; status?: string; result?: unknown; error?: string };
  }
  console.log("[pollTask] Invalid response format, returning undefined"); // DEBUG
  return undefined;
}
