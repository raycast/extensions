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
    const text = await response.text();
    let detail: string | undefined;
    try {
      const parsed = JSON.parse(text) as { message?: string; error?: string };
      detail = parsed.message ?? parsed.error;
    } catch {
      // Body wasn't JSON; fall through to generic error.
    }
    throw new Error(detail ?? `Habitica API error: ${response.status} ${response.statusText}`);
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
  invalidateUserCache();
}

export async function updateTask(taskId: string, body: UpdateTaskBody): Promise<HabiticaTask> {
  const result = await habiticaFetch<HabiticaTask>(`/api/v3/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  invalidateTasksCache();
  return result;
}

export async function createTask(body: CreateTaskBody): Promise<void> {
  await habiticaFetch("/api/v3/tasks/user", { method: "POST", body: JSON.stringify(body) });
  invalidateTasksCache();
}

export async function deleteTask(taskId: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}`, { method: "DELETE" });
  invalidateTasksCache();
}

export async function clearCompletedTodos(): Promise<void> {
  await habiticaFetch("/api/v3/tasks/clearCompletedTodos", { method: "POST" });
  invalidateTasksCache();
}

export async function addTagToTask(taskId: string, tagId: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/tags/${tagId}`, { method: "POST" });
  invalidateTasksCache();
}

export async function removeTagFromTask(taskId: string, tagId: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/tags/${tagId}`, { method: "DELETE" });
  invalidateTasksCache();
}

export async function getUser(): Promise<HabiticaUser> {
  if (isFresh(cache.user)) return cache.user.data;
  const data = await habiticaFetch<HabiticaUser>(
    "/api/v3/user?userFields=stats,party,items,profile,preferences,flags,needsCron,purchased.plan.mysteryItems",
  );
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

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export async function addChecklistItem(taskId: string, text: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/checklist`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  invalidateTasksCache();
}

export async function scoreChecklistItem(taskId: string, itemId: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/checklist/${itemId}/score`, { method: "POST" });
  invalidateTasksCache();
}

export async function updateChecklistItem(taskId: string, itemId: string, text: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/checklist/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ text }),
  });
  invalidateTasksCache();
}

export async function deleteChecklistItem(taskId: string, itemId: string): Promise<void> {
  await habiticaFetch(`/api/v3/tasks/${taskId}/checklist/${itemId}`, { method: "DELETE" });
  invalidateTasksCache();
}

// ---------------------------------------------------------------------------
// Inventory actions
// ---------------------------------------------------------------------------

export async function hatchPet(eggKey: string, potionKey: string): Promise<void> {
  await habiticaFetch(`/api/v3/user/hatch/${eggKey}/${potionKey}`, { method: "POST" });
  invalidateUserCache();
}

export async function feedPet(petKey: string, foodKey: string, amount = 1): Promise<void> {
  await habiticaFetch(`/api/v3/user/feed/${petKey}/${foodKey}?amount=${amount}`, { method: "POST" });
  invalidateUserCache();
}

export async function equipItem(type: "mount" | "pet" | "equipped" | "costume", key: string): Promise<void> {
  await habiticaFetch(`/api/v3/user/equip/${type}/${key}`, { method: "POST" });
  invalidateUserCache();
}

export async function sellItem(type: "eggs" | "hatchingPotions" | "food", key: string, amount = 1): Promise<void> {
  await habiticaFetch(`/api/v3/user/sell/${type}/${key}?amount=${amount}`, { method: "POST" });
  invalidateUserCache();
}

export async function openMysteryItem(): Promise<void> {
  await habiticaFetch("/api/v3/user/open-mystery-item", { method: "POST" });
  invalidateUserCache();
}

// ---------------------------------------------------------------------------
// Class / skills / stats
// ---------------------------------------------------------------------------

export async function castSpell(spellId: string, targetId?: string): Promise<void> {
  const query = targetId ? `?targetId=${encodeURIComponent(targetId)}` : "";
  await habiticaFetch(`/api/v3/user/class/cast/${spellId}${query}`, { method: "POST" });
  invalidateUserCache();
  invalidateTasksCache();
}

export async function allocateStat(stat: "str" | "con" | "int" | "per"): Promise<void> {
  await habiticaFetch(`/api/v3/user/allocate?stat=${stat}`, { method: "POST" });
  invalidateUserCache();
}

export async function allocateNow(): Promise<void> {
  await habiticaFetch("/api/v3/user/allocate-now", { method: "POST" });
  invalidateUserCache();
}

// ---------------------------------------------------------------------------
// User state
// ---------------------------------------------------------------------------

export async function toggleSleep(): Promise<void> {
  await habiticaFetch("/api/v3/user/sleep", { method: "POST" });
  invalidateUserCache();
}

export async function reviveUser(): Promise<void> {
  await habiticaFetch("/api/v3/user/revive", { method: "POST" });
  invalidateUserCache();
}
