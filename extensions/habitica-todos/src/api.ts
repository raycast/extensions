import { getPreferenceValues } from "@raycast/api";
import { HabiticaTask, HabiticaUser, HabiticaContent, HabiticaTag, CreateTaskBody, UpdateTaskBody } from "./types";

const HABITICA_API_URL = "https://habitica.com";

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

const TASKS_TTL_MS = 30_000;
const USER_TTL_MS = 30_000;
const TAGS_TTL_MS = 30_000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number; // 0 = session-lifetime (never expires)
}

const cache: {
  tasks: Map<string, CacheEntry<HabiticaTask[]>>;
  tags: CacheEntry<HabiticaTag[]> | null;
  user: CacheEntry<HabiticaUser> | null;
  content: CacheEntry<HabiticaContent> | null;
} = { tasks: new Map(), tags: null, user: null, content: null };

function isFresh<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  return entry.expiresAt === 0 || Date.now() < entry.expiresAt;
}

export function invalidateTasksCache(): void {
  cache.tasks.clear();
}
export function invalidateUserCache(): void {
  cache.user = null;
}
export function invalidateTagsCache(): void {
  cache.tags = null;
}

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

async function habiticaFetch<T>(endpoint: string, options: { method?: string; body?: string } = {}): Promise<T> {
  const { apiUserId, apiToken } = getPreferenceValues<Preferences>();

  const response = await fetch(`${HABITICA_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "x-api-user": apiUserId,
      "x-api-key": apiToken,
      "x-client": `${apiUserId}-habitica-todos`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Habitica API error: ${response.status} ${response.statusText} - ${await response.text()}`);
  }

  const json = (await response.json()) as { success: boolean; data: T; message?: string };
  if (!json.success) throw new Error(json.message ?? `Habitica API returned success: false for ${endpoint}`);
  return json.data;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

export async function getTasks(type?: string): Promise<HabiticaTask[]> {
  const key = type ?? "__all__";
  const cached = cache.tasks.get(key);
  if (isFresh(cached)) return cached.data;
  const data = await habiticaFetch<HabiticaTask[]>(`/api/v3/tasks/user${type ? `?type=${type}` : ""}`);
  cache.tasks.set(key, { data, expiresAt: Date.now() + TASKS_TTL_MS });
  return data;
}

export async function getTags(): Promise<HabiticaTag[]> {
  if (isFresh(cache.tags)) return cache.tags.data;
  const data = await habiticaFetch<HabiticaTag[]>("/api/v3/tags");
  cache.tags = { data, expiresAt: Date.now() + TAGS_TTL_MS };
  return data;
}

export async function scoreTask(taskId: string, direction: "up" | "down"): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/score/${direction}`, { method: "POST" });
  invalidateTasksCache();
  invalidateTagsCache();
  invalidateUserCache();
}

export async function updateTask(taskId: string, body: UpdateTaskBody): Promise<HabiticaTask> {
  const result = await habiticaFetch<HabiticaTask>(`/api/v3/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  invalidateTasksCache();
  invalidateTagsCache();
  return result;
}

export async function createTask(body: CreateTaskBody): Promise<void> {
  await habiticaFetch("/api/v3/tasks/user", { method: "POST", body: JSON.stringify(body) });
  invalidateTasksCache();
  invalidateTagsCache();
}

export async function deleteTask(taskId: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}`, { method: "DELETE" });
  invalidateTasksCache();
  invalidateTagsCache();
}

export async function getUser(): Promise<HabiticaUser> {
  if (isFresh(cache.user)) return cache.user.data;
  const data = await habiticaFetch<HabiticaUser>("/api/v3/user?userFields=stats,party,items,profile,preferences");
  cache.user = { data, expiresAt: Date.now() + USER_TTL_MS };
  return data;
}

export async function getContent(): Promise<HabiticaContent> {
  if (isFresh(cache.content)) return cache.content.data;
  // Only fetch gear — cuts the response by ~95% vs the full content endpoint.
  const data = await habiticaFetch<HabiticaContent>("/api/v3/content?language=en&fields=gear");
  cache.content = { data, expiresAt: 0 };
  return data;
}

export async function forceCompleteQuest(): Promise<void> {
  await habiticaFetch("/api/v3/groups/party/quests/force-complete", { method: "POST" });
  invalidateUserCache();
}

export async function acceptQuest(): Promise<void> {
  await habiticaFetch("/api/v3/groups/party/quests/accept", { method: "POST" });
  invalidateUserCache();
}

export async function abortQuest(): Promise<void> {
  await habiticaFetch("/api/v3/groups/party/quests/abort", { method: "POST" });
  invalidateUserCache();
}

export async function buyGear(key: string): Promise<void> {
  await habiticaFetch(`/api/v3/user/buy-gear/${key}`, { method: "POST" });
  invalidateUserCache();
}

export async function buyHealthPotion(): Promise<void> {
  await habiticaFetch("/api/v3/user/buy-health-potion", { method: "POST" });
  invalidateUserCache();
}

export async function buyArmoire(): Promise<void> {
  await habiticaFetch("/api/v3/user/buy-armoire", { method: "POST" });
  invalidateUserCache();
}
