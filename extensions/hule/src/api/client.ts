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

/** Hosts allowed to speak plain http — a self-hosted API on this very Mac. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The base every authenticated call goes to, refused unless it is https (or
 * loopback): the token travels in a header, and plain http would hand it to
 * anyone on the way.
 */
function secureBase(): string {
  const base = apiBase();
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new HuleError(0, `“${base}” is not a valid API URL. Check it in the extension preferences.`);
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && LOOPBACK.has(url.hostname))) {
    throw new HuleError(0, "The API URL must start with https:// — otherwise the token travels unencrypted.");
  }
  return base;
}

/**
 * The Authorization header, checked before it reaches `fetch`: a token with a
 * line break inside makes `fetch` throw an error that quotes the whole header —
 * token included — into a toast.
 */
function authHeader(): string {
  const token = preferences().token.trim();
  if (!/^[\x21-\x7e]+$/.test(token)) {
    throw new HuleError(401, "The API token contains characters a token never has. Paste it again in the preferences.");
  }
  return `Bearer ${token}`;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    // Two envelopes: `{ error, message }` from most routes, and the validation
    // pipe's `{ error: "ValidationError", issues: [{ path, message }] }`, where the
    // bare `error` would tell the user nothing.
    const body = (await res.json()) as {
      message?: string | string[];
      error?: string;
      issues?: Array<{ message?: string }>;
    };
    const message = Array.isArray(body.message) ? body.message.join("; ") : body.message;
    const issues = body.issues
      ?.map((issue) => issue.message)
      .filter(Boolean)
      .join("; ");
    return message || issues || body.error || res.statusText;
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
  const url = new URL(secureBase() + path);
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = {
    Authorization: authHeader(),
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

export function searchTasks(workspaceId: string, term: string, limit = 50, page = 1): Promise<FlatTaskResult> {
  // The search term travels as `q` — the API's own name for it, and 1–200 chars.
  // `page` is 1-based here, as everywhere in the API's own pagination.
  return request<FlatTaskResult>("GET", `/workspaces/${encodeURIComponent(workspaceId)}/tasks/search`, {
    query: { q: term.slice(0, 200), limit, page },
  });
}

/** Tasks matching a filter inside one workspace — the app's own filter DSL. */
export function queryTasks(
  workspaceId: string,
  filter?: { combinator: "and" | "or"; rules: Array<{ field: string; operator: string; value?: unknown }> },
  limit = 100,
  page = 1,
  { withSubtasks = false }: { withSubtasks?: boolean } = {},
): Promise<Task[]> {
  // `scope` is a LIST of nodes, not one node: a view may be rooted at several
  // lists or folders at once, and the endpoint takes the same shape either way.
  // `page` is 1-based; a page past the end comes back empty, with no total.
  // Without `subtaskSource` the endpoint answers with top-level tasks only; with
  // `parentsAndSubtasks` a subtask is a row of its own, like any task.
  return request<Task[]>("POST", "/tasks/query", {
    body: {
      scope: [{ type: "workspace", id: workspaceId }],
      filter,
      limit,
      page,
      ...(withSubtasks ? { subtaskSource: "parentsAndSubtasks" } : {}),
    },
  });
}

export function getTask(taskId: string): Promise<Task> {
  return request<Task>("GET", `/tasks/${encodeURIComponent(taskId)}`);
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
 * Origin of the web app, derived from the API host.
 *
 * That derivation holds for the hosted product; a self-hosted setup that splits
 * the two differently gets links it can correct by hand (documented in the
 * README).
 */
export function webBase(): string {
  return apiBase()
    .replace(/\/api$/, "")
    .replace("//api.", "//app.");
}

/**
 * Web URL of a task — what "Open in Hule" and "Copy Link" hand out.
 *
 * `/tasks/:id` is the app's permalink: it survives the task being moved, and it
 * is the same shape the notification emails and the Telegram bot emit.
 */
export function taskUrl(task: Task): string {
  return `${webBase()}/tasks/${encodeURIComponent(task.id)}`;
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
  return `hule://tasks/${encodeURIComponent(task.id)}`;
}

/**
 * Absolute form of the relative avatar path a member DTO carries, or undefined
 * when the path is not one. Only a root-relative path is joined: `//host/x` or
 * `@host/x` glued onto the base would move the request to another host.
 */
export function absoluteUrl(path: string): string | undefined {
  if (!path.startsWith("/") || path.startsWith("//")) return undefined;
  return apiBase().replace(/\/api$/, "") + path;
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  none: "None",
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

/** Largest image pulled into the detail view — a screenshot, not an archive. */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Bytes of an image attachment, or null when the file is not an image or is
 * larger than the detail view should hold.
 *
 * The file id comes from a task description, so the answer is judged before it
 * is read: the type from the headers, the size while streaming — a 25 MB archive
 * behind an image node is cancelled, not buffered.
 *
 * `proxy=1` is not optional here. Without it a file stored in R2 answers with a
 * redirect to a presigned URL, and a presigned request that also carries our
 * `Authorization` header is refused — two credentials for one request. The
 * proxy mode streams the bytes through the API itself, on our own token.
 */
export async function getImageBytes(
  workspaceId: string,
  fileId: string,
): Promise<{ data: Buffer; mime: string } | null> {
  const url = new URL(
    `${secureBase()}/workspaces/${encodeURIComponent(workspaceId)}/files/${encodeURIComponent(fileId)}`,
  );
  url.searchParams.set("proxy", "1");

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: authHeader() } });
  } catch (cause) {
    throw new HuleError(0, `Cannot reach ${url.origin}: ${(cause as Error).message}`);
  }
  if (!res.ok) throw new HuleError(res.status, await errorMessage(res));

  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const declared = Number(res.headers.get("content-length"));
  const reader = res.body?.getReader();
  if (!reader || !mime.startsWith("image/") || declared > MAX_IMAGE_BYTES) {
    await reader?.cancel();
    return null;
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return { data: Buffer.concat(chunks), mime };
}
