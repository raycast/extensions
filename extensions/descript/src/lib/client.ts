import { getApiToken } from "./preferences";
import { DescriptApiError } from "./errors";
import type {
  AgentJobStart,
  DescriptJob,
  DescriptProject,
  ImportJobStart,
  JobsResponse,
  JobTypeFilter,
  ProjectsResponse,
  PublishJobStart,
} from "./types";

const DESCRIPT_API_BASE_URL = "https://descriptapi.com";

/** Accepts a bare array or a wrapper object (`projects`, `data`, `items`, `results`, etc.). */
function extractList<T>(payload: unknown, preferredKeys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of [...preferredKeys, "data", "items", "results"]) {
      const value = obj[key];
      if (Array.isArray(value)) return value as T[];
    }
  }
  return [];
}

function extractCursor(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  for (const key of ["cursor", "next_cursor", "nextCursor", "next"]) {
    const value = obj[key];
    if (typeof value === "string") return value;
  }
  const pagination = obj["pagination"];
  if (pagination && typeof pagination === "object") {
    const p = pagination as Record<string, unknown>;
    for (const key of ["cursor", "next_cursor", "nextCursor", "next"]) {
      const value = p[key];
      if (typeof value === "string") return value;
    }
  }
  return null;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
  /** Skip JSON Content-Type and stringification (used for raw binary uploads). */
  raw?: boolean;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${DESCRIPT_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

type FetchRequestInit = NonNullable<Parameters<typeof fetch>[1]>;

function buildHeaders(raw: boolean): Record<string, string> {
  const token = getApiToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (!raw) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, raw = false } = options;
  const url = buildUrl(path, query);

  const response = await fetch(url, {
    method,
    headers: buildHeaders(raw),
    body: body === undefined ? undefined : raw ? (body as FetchRequestInit["body"]) : JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let text = "";
    try {
      text = await response.text();
    } catch {
      // Body unreadable — fall through with an empty error body.
    }
    const retryAfter = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfter ? Number(retryAfter) : undefined;
    throw new DescriptApiError(response.status, `Descript ${method} ${path} failed (${response.status})`, {
      retryAfterSeconds: Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined,
      body: text,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type ProjectSortField = "name" | "created_at" | "updated_at" | "last_viewed_at";
export type SortDirection = "asc" | "desc";

export const descript = {
  async listProjects(opts?: {
    limit?: number;
    cursor?: string;
    name?: string;
    folderPath?: string;
    sort?: ProjectSortField;
    direction?: SortDirection;
    signal?: AbortSignal;
  }): Promise<ProjectsResponse> {
    const raw = await request<unknown>("/v1/projects", {
      query: {
        limit: opts?.limit ?? 50,
        cursor: opts?.cursor,
        name: opts?.name,
        folder_path: opts?.folderPath,
        sort: opts?.sort,
        direction: opts?.direction,
      },
      signal: opts?.signal,
    });
    return {
      projects: extractList<DescriptProject>(raw, ["projects", "data"]),
      cursor: extractCursor(raw),
    };
  },

  async getProject(projectId: string, signal?: AbortSignal): Promise<DescriptProject> {
    return request<DescriptProject>(`/v1/projects/${encodeURIComponent(projectId)}`, { signal });
  },

  async listJobs(opts?: {
    limit?: number;
    cursor?: string;
    type?: JobTypeFilter;
    projectId?: string;
    createdAfter?: string;
    createdBefore?: string;
    signal?: AbortSignal;
  }): Promise<JobsResponse> {
    const raw = await request<unknown>("/v1/jobs", {
      query: {
        limit: opts?.limit ?? 30,
        cursor: opts?.cursor,
        type: opts?.type,
        project_id: opts?.projectId,
        created_after: opts?.createdAfter,
        created_before: opts?.createdBefore,
      },
      signal: opts?.signal,
    });
    return {
      jobs: extractList<DescriptJob>(raw, ["jobs"]),
      cursor: extractCursor(raw),
    };
  },

  async getJob(jobId: string, signal?: AbortSignal): Promise<DescriptJob> {
    return request<DescriptJob>(`/v1/jobs/${encodeURIComponent(jobId)}`, { signal });
  },

  async cancelJob(jobId: string, signal?: AbortSignal): Promise<void> {
    await request<void>(`/v1/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE", signal });
  },

  async startProjectMediaImport(payload: Record<string, unknown>, signal?: AbortSignal): Promise<ImportJobStart> {
    return request<ImportJobStart>("/v1/jobs/import/project_media", {
      method: "POST",
      body: payload,
      signal,
    });
  },

  async startAgentJob(payload: Record<string, unknown>, signal?: AbortSignal): Promise<AgentJobStart> {
    return request<AgentJobStart>("/v1/jobs/agent", {
      method: "POST",
      body: payload,
      signal,
    });
  },

  async startPublishJob(payload: Record<string, unknown>, signal?: AbortSignal): Promise<PublishJobStart> {
    return request<PublishJobStart>("/v1/jobs/publish", {
      method: "POST",
      body: payload,
      signal,
    });
  },
};
