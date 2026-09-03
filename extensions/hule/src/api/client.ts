import { getPreferenceValues } from "@raycast/api";
import type { AvailableBundle, CreateTaskInput, FlatTaskResult, Priority, Task, UpdateTaskInput, User } from "./types";

const DEFAULT_API_URL = "https://api.hule-do.com/api";

/**
 * Error carrying the HTTP status plus whatever human-readable message the API's
 * error envelope held (`{ error, message }`, where `message` may be an array of
 * validation strings).
 */
export class HuleError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HuleError";
  }
}

/**
 * `Preferences` is generated from the manifest into `raycast-env.d.ts` — never
 * hand-written here, or a renamed preference would keep type-checking while
 * reading `undefined` at runtime.
 */
export function preferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

function apiBase(): string {
  const raw = preferences().apiUrl.trim();
  return (raw.length > 0 ? raw : DEFAULT_API_URL).replace(/\/+$/, "");
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[]; error?: string };
    const message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
    return message || body.error || res.statusText;
  } catch {
    return res.statusText;
  }
}

type Method = "GET" | "POST" | "PATCH" | "DELETE";

/**
 * One funnel for every call, so the Bearer credential, the error mapping and
 * the empty-body handling are defined once. All authorization stays server-side
 * — a request here is an ordinary authenticated REST call, and the API's own
 * guards remain the only thing deciding what the token may touch.
 */
async function request<T>(
  method: Method,
  path: string,
  opts: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
): Promise<T> {
  const url = new URL(apiBase() + path);
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${preferences().token.trim()}`,
    Accept: "application/json",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch (cause) {
    throw new HuleError(0, `Cannot reach ${url.origin}: ${(cause as Error).message}`);
  }

  if (res.status === 401) {
    throw new HuleError(401, "Hule rejected the token. Check it in Settings → API tokens.");
  }
  if (!res.ok) throw new HuleError(res.status, await errorMessage(res));
  if (res.status === 204) return null as T;

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Lists, statuses, members and tags of every workspace — one call, one cache. */
export function getBundle(): Promise<AvailableBundle> {
  return request<AvailableBundle>("GET", "/available/all");
}

export function getMe(): Promise<User> {
  return request<User>("GET", "/auth/me");
}

export function searchTasks(workspaceId: string, term: string, limit = 50): Promise<FlatTaskResult> {
  // The search term travels as `q` — the API's own name for it, and 1–200 chars.
  return request<FlatTaskResult>("GET", `/workspaces/${encodeURIComponent(workspaceId)}/tasks/search`, {
    query: { q: term.slice(0, 200), limit },
  });
}

/** Tasks matching a filter inside one workspace — the app's own filter DSL. */
export function queryTasks(
  workspaceId: string,
  filter?: { combinator: "and" | "or"; rules: Array<{ field: string; operator: string; value?: unknown }> },
  limit = 100,
): Promise<Task[]> {
  // `scope` is a LIST of nodes, not one node: a view may be rooted at several
  // lists or folders at once, and the endpoint takes the same shape either way.
  return request<Task[]>("POST", "/tasks/query", {
    body: { scope: [{ type: "workspace", id: workspaceId }], filter, limit },
  });
}

export function getTask(taskId: string): Promise<Task> {
  return request<Task>("GET", `/tasks/${encodeURIComponent(taskId)}`);
}

export function listTasks(listId: string): Promise<Task[]> {
  return request<Task[]>("GET", `/lists/${encodeURIComponent(listId)}/tasks`);
}

export function createTask(listId: string, input: CreateTaskInput): Promise<Task> {
  return request<Task>("POST", `/lists/${encodeURIComponent(listId)}/tasks`, { body: input });
}

export function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  return request<Task>("PATCH", `/tasks/${encodeURIComponent(taskId)}`, { body: input });
}

export function deleteTask(taskId: string): Promise<void> {
  return request<void>("DELETE", `/tasks/${encodeURIComponent(taskId)}`);
}

/**
 * Web URL of a task — what "Open in Hule" and "Copy Link" hand out.
 *
 * `/tasks/:id` is the app's permalink: it survives the task being moved, and it
 * is the same shape the notification emails and the Telegram bot emit. The web
 * host is derived from the API host, which holds for the hosted product; a
 * self-hosted setup that splits the two differently gets a link it can correct
 * by hand (documented in the README).
 */
export function taskUrl(task: Task): string {
  const web = apiBase()
    .replace(/\/api$/, "")
    .replace("//api.", "//app.");
  return `${web}/tasks/${task.id}`;
}

/**
 * The same task addressed to the desktop app — `hule://tasks/<id>`.
 *
 * A scheme of its own rather than the https link above: the desktop shell is
 * unsigned, and https deep links (universal links) need a notarized app bound to
 * an association file on the domain. Only an installed shell that registered the
 * scheme claims this URL; everyone else keeps getting the web link, which is
 * also the one "Copy Link" hands out — a copied link has to work for people
 * without the app.
 */
export function taskAppUrl(task: Task): string {
  return `hule://tasks/${task.id}`;
}

/** Absolute form of the relative avatar path a member DTO carries. */
export function absoluteUrl(path: string): string {
  return apiBase().replace(/\/api$/, "") + path;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  none: "None",
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

/**
 * Raw bytes of an attachment — images in a description are fetched this way.
 *
 * `proxy=1` is not optional here. Without it a file stored in R2 answers with a
 * redirect to a presigned URL, and a presigned request that also carries our
 * `Authorization` header is refused — two credentials for one request. The
 * proxy mode streams the bytes through the API itself, on our own token.
 */
export async function getFileBytes(workspaceId: string, fileId: string): Promise<{ data: Buffer; mime: string }> {
  const url = new URL(`${apiBase()}/workspaces/${encodeURIComponent(workspaceId)}/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("proxy", "1");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${preferences().token.trim()}` } });
  if (!res.ok) throw new HuleError(res.status, await errorMessage(res));
  return {
    data: Buffer.from(await res.arrayBuffer()),
    mime: res.headers.get("content-type") ?? "application/octet-stream",
  };
}
