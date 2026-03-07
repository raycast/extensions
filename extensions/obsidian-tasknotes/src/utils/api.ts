const BASE_PATH = "/api";

export function getApiUrl(port: string, path: string, params?: Record<string, string | number>): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  let url = `http://localhost:${port}${BASE_PATH}/${cleanPath}`;
  if (params && Object.keys(params).length > 0) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      search.set(key, String(value));
    }
    url += `?${search.toString()}`;
  }
  return url;
}

export const API_ENDPOINTS = {
  tasks: "tasks",
  updateTask: (taskId: string) => `tasks/${encodeURIComponent(taskId)}`,
  toggleStatus: (taskId: string) => `tasks/${encodeURIComponent(taskId)}/toggle-status`,
  deleteTask: (taskId: string) => `tasks/${encodeURIComponent(taskId)}`,
  nlpCreate: "nlp/create",
  nlpParse: "nlp/parse",
} as const;

export function getFetchOptions(method: string = "GET", body?: unknown, authToken?: string): RequestInit {
  const headers: Record<string, string> = {};
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const opts: RequestInit = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return opts;
}
