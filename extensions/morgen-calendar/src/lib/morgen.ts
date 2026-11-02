import { getPreferenceValues } from "@raycast/api";
import type { Calendar, Event, Task } from "../types";
import { sendMorgenRequest } from "./transport";
import { loadEventsByAccount, type EventListResult } from "./event-loader";

const cache = new Map<string, { expires: number; value: unknown }>();
let cacheRevision = 0;

export function invalidateCache(): void {
  cacheRevision++;
  cache.clear();
}

function apiKey(): string {
  return getPreferenceValues<Preferences>().apiKey.trim();
}

async function request<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; ttlMs?: number } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const revision = cacheRevision;
  const cacheKey = `${apiKey()}:${path}`;
  const cached = cache.get(cacheKey);
  if (method === "GET" && options.ttlMs && cached && cached.expires > Date.now()) return cached.value as T;

  const value = await sendMorgenRequest<T>(path, apiKey(), options);
  if (method === "POST") invalidateCache();
  else if (options.ttlMs && revision === cacheRevision)
    cache.set(cacheKey, { expires: Date.now() + options.ttlMs, value });
  return value as T;
}

export async function listCalendars(): Promise<Calendar[]> {
  const result = await request<{ data: { calendars: Calendar[] } }>("/calendars/list", { ttlMs: 5 * 60_000 });
  return result.data.calendars;
}

export async function listEvents(calendars: Calendar[], start: Date, end: Date): Promise<EventListResult> {
  return loadEventsByAccount(calendars, start, end, async (params) => {
    const result = await request<{ data: { events: Event[] } }>(`/events/list?${params}`, { ttlMs: 60_000 });
    return result.data.events;
  });
}

export interface EventInput {
  accountId: string;
  calendarId: string;
  title: string;
  start: string;
  duration: string;
  timeZone: string | null;
  showWithoutTime: boolean;
  description?: string;
}

export async function createEvent(input: EventInput): Promise<Event> {
  const result = await request<{ data: { event: Event } }>("/events/create", {
    method: "POST",
    body: input,
  });
  return result.data.event;
}

export async function updateEvent(event: Event, changes: { title: string; description: string }): Promise<void> {
  const patch: {
    title?: string;
    description?: string;
    descriptionContentType?: string;
  } = {};
  if (changes.title !== event.title) patch.title = changes.title;
  if (changes.description !== (event.description ?? "")) {
    patch.description = changes.description;
    patch.descriptionContentType = "text/plain";
  }
  if (Object.keys(patch).length === 0) return;
  await request("/events/update", {
    method: "POST",
    body: {
      id: event.id,
      accountId: event.accountId,
      calendarId: event.calendarId,
      ...patch,
    },
  });
}

export async function deleteEvent(event: Event): Promise<void> {
  await request("/events/delete", {
    method: "POST",
    body: {
      id: event.id,
      accountId: event.accountId,
      calendarId: event.calendarId,
    },
  });
}

export async function listTasks(): Promise<Task[]> {
  const result = await request<{ data: { tasks: Task[] } }>("/tasks/list?limit=100", { ttlMs: 60_000 });
  return result.data.tasks.filter((task) => !task.deleted);
}

export interface TaskInput {
  title: string;
  description?: string;
  due?: string;
  timeZone?: string;
  estimatedDuration?: string;
  priority?: number;
}

export async function createTask(input: TaskInput): Promise<string> {
  const result = await request<{ data: { id: string } }>("/tasks/create", {
    method: "POST",
    body: input,
  });
  return result.data.id;
}

export async function updateTask(task: Task, changes: TaskInput): Promise<void> {
  const patch: Partial<TaskInput> = {};
  if (changes.title !== task.title) patch.title = changes.title;
  if (changes.description !== (task.description ?? "")) patch.description = changes.description;
  if (changes.priority !== (task.priority ?? 0)) patch.priority = changes.priority;
  if (Object.keys(patch).length === 0) return;
  await request("/tasks/update", {
    method: "POST",
    body: { id: task.id, ...patch },
  });
}

export async function closeTask(task: Task): Promise<void> {
  await request("/tasks/close", { method: "POST", body: { id: task.id } });
}

export async function deleteTask(task: Task): Promise<void> {
  await request("/tasks/delete", { method: "POST", body: { id: task.id } });
}
