import { getAccessToken } from "@raycast/utils";
import { environment } from "@raycast/api";
import { messageForStatus } from "./errors";
import { katoApiBaseUrl } from "./oauth-config";
import { oauthClient } from "./oauth";
import type {
  ActivityItem,
  DailyBrief,
  KatoNotification,
  ObjectTypeOption,
  Priority,
  RecordSearchResult,
  ScheduleItem,
  SearchResult,
  Task,
  TaskCreateOptions,
  TaskDetail,
  TaskStatus,
  TaskUpdateInput,
  WhoAmI,
} from "./types";

const API_URL = katoApiBaseUrl(environment.isDevelopment);

export class KatoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "KatoApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const storedTokens = await oauthClient.getTokens();
  const token = storedTokens?.accessToken ?? getAccessToken().token;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new KatoApiError(
      "Kato is unreachable. Check your internet connection.",
      0,
      "offline",
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string | { code?: string; message?: string };
      code?: string;
    } | null;
    const nested = typeof body?.error === "object" ? body.error : undefined;
    const code = nested?.code ?? body?.code;
    const fallback =
      nested?.message ?? (typeof body?.error === "string" ? body.error : "");
    throw new KatoApiError(
      messageForStatus(response.status, code, fallback),
      response.status,
      code,
    );
  }
  return (await response.json()) as T;
}

type CacheEntry = { expiresAt: number; value: unknown };
const cache = new Map<string, CacheEntry>();

async function cached<T>(
  key: string,
  load: () => Promise<T>,
  ttlMs = 15_000,
): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  const value = await load();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function clearKatoCache(prefix = "") {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

export const katoApi = {
  whoami: () => cached("whoami", () => request<WhoAmI>("/whoami"), 60_000),
  statuses: () =>
    cached(
      "statuses",
      async () =>
        (await request<{ data: TaskStatus[] }>("/task-statuses")).data,
      60_000,
    ),
  tasks: async () => {
    const all: Task[] = [];
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ completion: "open", limit: "100" });
      if (cursor) query.set("cursor", cursor);
      const page = await request<{
        data: Task[];
        hasMore: boolean;
        nextCursor: string | null;
      }>(`/tasks?${query}`);
      all.push(...page.data);
      cursor = page.hasMore ? page.nextCursor : null;
    } while (cursor);
    return all;
  },
  task: (taskId: string, signal?: AbortSignal) =>
    request<{ data: TaskDetail }>(
      `/tasks/${encodeURIComponent(taskId)}`,
      {},
      signal,
    ).then((response) => response.data),
  upcomingMeetings: () =>
    cached(
      "meetings",
      async () =>
        (await request<{ data: ScheduleItem[] }>("/meetings/upcoming?limit=60"))
          .data,
    ),
  search: async (query: string, types: string[], signal?: AbortSignal) => {
    const params = new URLSearchParams({ q: query, limit: "40" });
    if (types.length) params.set("types", types.join(","));
    return (
      await request<{ data: SearchResult[] }>(`/search?${params}`, {}, signal)
    ).data;
  },
  recentRecords: (signal?: AbortSignal) =>
    cached(
      "recent-records",
      async () =>
        (
          await request<{ data: SearchResult[] }>(
            "/records/recent?limit=20",
            {},
            signal,
          )
        ).data,
      15_000,
    ),
  objects: () =>
    cached(
      "objects",
      async () =>
        (await request<{ data: ObjectTypeOption[] }>("/objects")).data,
      60_000,
    ),
  recordsForObject: async (
    objectSlug: string,
    query = "",
    signal?: AbortSignal,
  ) => {
    const all: RecordSearchResult[] = [];
    let cursor: string | null = null;
    do {
      const params = new URLSearchParams({ limit: "100" });
      if (query.trim()) params.set("q", query.trim());
      if (cursor) params.set("cursor", cursor);
      const page = await request<{
        data: RecordSearchResult[];
        hasMore: boolean;
        nextCursor: string | null;
      }>(
        `/objects/${encodeURIComponent(objectSlug)}/records?${params}`,
        {},
        signal,
      );
      all.push(...page.data);
      cursor = page.hasMore ? page.nextCursor : null;
    } while (cursor);
    return all;
  },
  taskCreateOptions: (signal?: AbortSignal) =>
    cached("task-create-options", () =>
      request<TaskCreateOptions>("/task-options", {}, signal),
    ),
  createTask: async (input: {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: Priority;
    status?: string;
    assignees?: string[];
    estimatedTime?: number;
    linkedRecordIds?: string[];
    linkedMeetingIds?: string[];
    sectionId?: string;
  }) => {
    const response = await request<{ data: Task }>("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
    clearKatoCache();
    return response.data;
  },
  updateTask: async (taskId: string, input: TaskUpdateInput) => {
    const response = await request<{ data: Task }>(
      `/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
    clearKatoCache();
    return response.data;
  },
  addComment: async (input: {
    entityType: "task" | "record" | "meeting";
    entityId: string;
    comment: string;
  }) => {
    const response = await request<{ data: { activityId: string } }>(
      "/comments",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    clearKatoCache();
    return response.data;
  },
  activity: async (
    entityType: "task" | "record" | "meeting",
    entityId: string,
    signal?: AbortSignal,
  ) =>
    (
      await request<{ data: ActivityItem[] }>(
        `/entities/${entityType}/${encodeURIComponent(entityId)}/activity`,
        {},
        signal,
      )
    ).data,
  brief: () =>
    cached(
      "brief",
      async () => (await request<{ data: DailyBrief }>("/brief")).data,
      10_000,
    ),
  notifications: async (status: "all" | "unread" | "read" = "all") => {
    const all: KatoNotification[] = [];
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ status, limit: "100" });
      if (cursor) query.set("cursor", cursor);
      const page = await request<{
        data: KatoNotification[];
        hasMore: boolean;
        nextCursor: string | null;
      }>(`/notifications?${query}`);
      all.push(...page.data);
      cursor = page.hasMore ? page.nextCursor : null;
    } while (cursor);
    return all;
  },
  markNotificationRead: async (notificationId: string) => {
    await request(`/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: "POST",
    });
    clearKatoCache();
  },
  markNotificationUnread: async (notificationId: string) => {
    await request(
      `/notifications/${encodeURIComponent(notificationId)}/unread`,
      {
        method: "POST",
      },
    );
    clearKatoCache();
  },
  markAllNotificationsRead: async () => {
    const response = await request<{ data: { marked: number } }>(
      "/notifications/read-all",
      { method: "POST" },
    );
    clearKatoCache();
    return response.data.marked;
  },
  dismissNotification: async (notificationId: string) => {
    await request(`/notifications/${encodeURIComponent(notificationId)}`, {
      method: "DELETE",
    });
    clearKatoCache();
  },
};
