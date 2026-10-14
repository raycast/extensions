import { getCredentials, isDemoMode } from "./config";
import { DemoNotFoundError, demoRequest } from "./demo";
import type {
  Agent,
  AgentTask,
  Comment,
  CreateIssueInput,
  InboxItem,
  Issue,
  IssueStatus,
  Member,
  Project,
  QuickCreateInput,
  Runtime,
  SearchIssue,
  Squad,
  UpdateIssueInput,
  User,
  Workspace,
} from "./types";

export class MulticaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: Record<string, unknown> | undefined,
  ) {
    super(message);
    this.name = "MulticaApiError";
  }

  get code(): string | undefined {
    return typeof this.body?.code === "string" ? this.body.code : undefined;
  }
}

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  workspaceId?: string;
  query?: Query;
  body?: unknown;
}

async function request<T>(path: string, { method = "GET", workspaceId, query, body }: RequestOptions = {}): Promise<T> {
  const { serverUrl, token } = getCredentials();
  const url = new URL(serverUrl + path);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  if (isDemoMode()) {
    try {
      return await demoRequest<T>({ method, path, workspaceId, query: url.searchParams, body });
    } catch (error) {
      if (error instanceof DemoNotFoundError) throw new MulticaApiError(error.message, 404, undefined);
      throw error;
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "X-Client-Platform": "raycast",
  };
  if (workspaceId) headers["X-Workspace-ID"] = workspaceId;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }

  if (!response.ok) {
    const errorBody = json && typeof json === "object" ? (json as Record<string, unknown>) : undefined;
    const message =
      typeof errorBody?.error === "string"
        ? errorBody.error
        : typeof errorBody?.reason === "string"
          ? errorBody.reason
          : response.status === 401
            ? "Multica rejected the token. Sign in again or update the API token preference."
            : `Multica API error (${response.status})`;
    throw new MulticaApiError(message, response.status, errorBody);
  }

  return json as T;
}

// Account

export const getMe = () => request<User>("/api/me");
export const listWorkspaces = () => request<Workspace[]>("/api/workspaces");
export const listMembers = (workspaceId: string) => request<Member[]>(`/api/workspaces/${workspaceId}/members`);

// Issues

export interface ListIssuesParams {
  status_category?: string;
  status?: string;
  assignee_id?: string;
  assignee_types?: string;
  sort?: "updated_at" | "created_at" | "priority" | "status" | "last_activity" | "due_date";
  direction?: "asc" | "desc";
  limit?: number;
}

export const listIssues = (workspaceId: string, params: ListIssuesParams) =>
  request<{ issues: Issue[]; total: number }>("/api/issues", { workspaceId, query: { ...params } });

export const searchIssues = (workspaceId: string, q: string, limit = 50) =>
  request<{ issues: SearchIssue[] }>("/api/issues/search", {
    workspaceId,
    query: { q, limit, include_closed: true },
  });

export const getIssue = (workspaceId: string, idOrIdentifier: string) =>
  request<Issue>(`/api/issues/${encodeURIComponent(idOrIdentifier)}`, { workspaceId });

export const createIssue = (workspaceId: string, input: CreateIssueInput) =>
  request<Issue>("/api/issues", { method: "POST", workspaceId, body: input });

export const updateIssue = (workspaceId: string, id: string, input: UpdateIssueInput) =>
  request<Issue>(`/api/issues/${id}`, { method: "PUT", workspaceId, body: input });

/** Hands `prompt` to an agent (or a squad's leader), which files the issue asynchronously. */
export const quickCreateIssue = (workspaceId: string, input: QuickCreateInput) =>
  request<{ task_id: string }>("/api/issues/quick-create", { method: "POST", workspaceId, body: input });

export const listIssueStatuses = async (workspaceId: string) =>
  (await request<{ statuses: IssueStatus[] }>("/api/issue-statuses", { workspaceId })).statuses;

export const listComments = (workspaceId: string, issueId: string) =>
  request<Comment[]>(`/api/issues/${issueId}/comments`, { workspaceId });

export const createComment = (workspaceId: string, issueId: string, content: string) =>
  request<Comment>(`/api/issues/${issueId}/comments`, { method: "POST", workspaceId, body: { content } });

export const listProjects = async (workspaceId: string) =>
  (await request<{ projects: Project[] }>("/api/projects", { workspaceId })).projects;

// Agents & runtimes

export const listAgents = (workspaceId: string) => request<Agent[]>("/api/agents", { workspaceId });
export const listSquads = (workspaceId: string) => request<Squad[]>("/api/squads", { workspaceId });
export const listRuntimes = (workspaceId: string) => request<Runtime[]>("/api/runtimes", { workspaceId });
export const listAgentTasks = (workspaceId: string, agentId: string, limit = 25) =>
  request<AgentTask[]>(`/api/agents/${agentId}/tasks`, { workspaceId, query: { limit } });

// Inbox

export const listInbox = (workspaceId: string) => request<InboxItem[]>("/api/inbox", { workspaceId });

export const setInboxRead = (workspaceId: string, id: string, read: boolean) =>
  request<unknown>(`/api/inbox/${id}/${read ? "read" : "unread"}`, { method: "POST", workspaceId });

export const archiveInboxItem = (workspaceId: string, id: string) =>
  request<unknown>(`/api/inbox/${id}/archive`, { method: "POST", workspaceId });

/**
 * Unread inbox counts for every workspace the user belongs to. The route sits
 * behind workspace membership, so any one of the user's workspaces is sent.
 * Workspaces with nothing unread may be omitted.
 */
export const getUnreadInboxSummary = (anyWorkspaceId: string) =>
  request<{ workspace_id: string; count: number }[]>("/api/inbox/unread-summary", { workspaceId: anyWorkspaceId });

export const markAllInboxRead = (workspaceId: string) =>
  request<unknown>("/api/inbox/mark-all-read", { method: "POST", workspaceId });
