import { getPreferenceValues } from "@raycast/api";
import { Temporal } from "@js-temporal/polyfill";
import type { Calendar, Event, Task } from "../types";
import { sendMorgenRequest } from "./transport";
import { canModifyEvent } from "./event-permissions";
import { eventStartDate } from "./dates";
import { loadEventsByAccount, type EventListResult } from "./event-loader";
const cache = new Map<string, { expires: number; value: unknown }>();
let cacheApiKey: string | undefined;
let cacheRevision = 0;
export function invalidateCache(): void {
  cacheRevision++;
  cache.clear();
}
export async function morgenFetch<T>(path: string, options?: RequestInit, ttlMs = 0): Promise<T> {
  const apiKey = (getPreferenceValues<Preferences>().apiKey ?? "").trim();
  if (cacheApiKey !== apiKey) {
    invalidateCache();
    cacheApiKey = apiKey;
  }
  const method = (options?.method ?? "GET").toUpperCase();
  const cached = cache.get(path);
  if (method === "GET" && ttlMs && cached && cached.expires > Date.now()) return structuredClone(cached.value) as T;
  if (method !== "GET") invalidateCache();
  const revision = cacheRevision;
  try {
    const value = await sendMorgenRequest<T>(path, apiKey, options);
    if (method === "GET" && ttlMs && revision === cacheRevision && value !== undefined) {
      for (const [key, entry] of cache) if (entry.expires <= Date.now()) cache.delete(key);
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(path, { expires: Date.now() + ttlMs, value: structuredClone(value) });
    }
    return value;
  } finally {
    if (method !== "GET") invalidateCache();
  }
}
interface CalendarsResponse {
  data: {
    accounts: unknown[];
    calendars: Calendar[];
  };
}

interface EventsResponse {
  data: {
    events: Event[];
  };
}

export async function listCalendars(forceRefresh = false): Promise<Calendar[]> {
  if (forceRefresh) invalidateCache();
  const result = await morgenFetch<CalendarsResponse>("/calendars/list", undefined, 5 * 60_000);
  if (!Array.isArray(result?.data?.calendars))
    throw new Error("Morgen returned no calendar list. Availability is unknown.");
  return result.data.calendars;
}

export async function readEvents(
  accountId: string,
  calendarIds: string[],
  start: string,
  end: string,
): Promise<Event[]> {
  const params = new URLSearchParams({
    accountId,
    calendarIds: calendarIds.join(","),
    start,
    end,
  });
  const result = await morgenFetch<EventsResponse>(`/events/list?${params.toString()}`, undefined, 60_000);
  if (!Array.isArray(result?.data?.events)) throw new Error("Morgen returned no event list. Availability is unknown.");
  return result.data.events
    .filter((event) => calendarIds.includes(event.calendarId) && (!event.accountId || event.accountId === accountId))
    .map((event) => ({ ...event, accountId }));
}

export interface CreateEventPayload {
  accountId: string;
  calendarId: string;
  title: string;
  start: string;
  duration: string;
  timeZone: string | null;
  showWithoutTime: boolean;
  description?: string;
}

async function sendCreateEvent(payload: CreateEventPayload): Promise<Event> {
  const result = await morgenFetch<{ data: { event: Event } }>("/events/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!result?.data?.event?.id) {
    throw new Error("Creation response did not include an event ID. Check Morgen before retrying.");
  }
  return result.data.event;
}

function identity(event: Event) {
  if (!event.id || !event.accountId || !event.calendarId)
    throw new Error("This event has no complete identity. Refresh the event list.");
  return {
    id: event.id,
    accountId: event.accountId,
    calendarId: event.calendarId,
  };
}

function title(value: string): string {
  if (!value.trim()) throw new Error("Enter a title.");
  return value.trim();
}

export async function listEvents(
  calendars: Calendar[],
  start: Date,
  end: Date,
  onFailures?: (failures: EventListResult["failures"]) => void,
): Promise<Event[]> {
  // Recheck connected calendars instead of trusting an old selection.
  const available = await listCalendars();
  const selected = available.filter(
    (c) =>
      c.myRights?.mayReadItems !== false &&
      calendars.some((requested) => requested.id === c.id && requested.accountId === c.accountId),
  );
  const result = await loadEventsByAccount(selected, start, end, async (params) =>
    readEvents(
      params.get("accountId")!,
      params.get("calendarIds")!.split(","),
      params.get("start")!,
      params.get("end")!,
    ),
  );
  if (result.failures.length) {
    if (onFailures) onFailures(result.failures);
    else throw new Error("Could not load all calendar accounts. Availability is unknown.");
  }
  return result.events;
}

export async function createEvent(input: CreateEventPayload): Promise<Event> {
  const normalized = { ...input, title: title(input.title) };
  const local = Temporal.PlainDateTime.from(input.start, {
    overflow: "reject",
  });
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(input.start))
    throw new Error("Start must be a local date/time without an offset.");
  if (input.showWithoutTime) {
    if (input.timeZone !== null || input.duration !== "P1D" || !input.start.endsWith("T00:00:00"))
      throw new Error("All-day events must use local midnight, P1D, and no timezone.");
  } else {
    if (!input.timeZone || /^[+-]/.test(input.timeZone)) throw new Error("An IANA timezone is required.");
    local.toZonedDateTime(input.timeZone, { disambiguation: "reject" });
    const minutes = Temporal.Duration.from(input.duration).total({
      unit: "minutes",
    });
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 10080)
      throw new Error("Choose a duration between 1 and 10080 minutes.");
  }
  const calendars = await listCalendars(true);
  const calendar = calendars.find((c) => c.id === input.calendarId && c.accountId === input.accountId);
  if (!calendar || !(calendar.myRights?.mayWriteAll || calendar.myRights?.mayWriteOwn))
    throw new Error("Select a writable connected calendar.");
  return sendCreateEvent(normalized);
}

async function currentWritableEvent(event: Event): Promise<Event> {
  identity(event);
  const calendars = await listCalendars(true);
  const calendar = calendars.find((c) => c.id === event.calendarId && c.accountId === event.accountId);
  if (!calendar || calendar.myRights?.mayReadItems === false)
    throw new Error("This event's calendar is disconnected or cannot be read.");
  // Re-read this occurrence before checking ownership; stale UI permissions never authorize a write.
  const instant = eventStartDate(event).getTime();
  const events = await readEvents(
    event.accountId,
    [event.calendarId],
    new Date(instant - 86400000).toISOString(),
    new Date(instant + 86400000).toISOString(),
  );
  const matches = events.filter(
    (candidate) =>
      candidate.id === event.id && candidate.calendarId === event.calendarId && candidate.accountId === event.accountId,
  );
  const current = matches.length === 1 ? matches[0] : undefined;
  if (!current || current.recurrenceId !== event.recurrenceId || !canModifyEvent(calendar, current))
    throw new Error("This event is unavailable or you do not have permission to modify it. Refresh the event list.");
  return current;
}

export async function updateEvent(event: Event, changes: { title: string; description: string }): Promise<void> {
  const newTitle = title(changes.title);
  const current = await currentWritableEvent(event);
  // Do not overwrite another client's changes from an old edit form.
  if (current.title !== event.title || (current.description ?? "") !== (event.description ?? ""))
    throw new Error("This event changed since you opened it. Refresh before editing.");
  const patch: {
    title?: string;
    description?: string;
    descriptionContentType?: string;
  } = {};
  if (newTitle !== current.title) patch.title = newTitle;
  if (changes.description !== (current.description ?? "")) {
    patch.description = changes.description;
    patch.descriptionContentType = "text/plain";
  }
  if (!Object.keys(patch).length) return;
  await morgenFetch("/events/update", {
    method: "POST",
    body: JSON.stringify({ ...identity(current), ...patch }),
  });
}

export async function deleteEvent(event: Event): Promise<void> {
  const current = await currentWritableEvent(event);
  await morgenFetch("/events/delete", {
    method: "POST",
    body: JSON.stringify(identity(current)),
  });
}

export async function listTasks(): Promise<Task[]> {
  const result = await morgenFetch<{ data: { tasks: Task[] } }>("/tasks/list?limit=100", undefined, 60_000);
  if (!Array.isArray(result?.data?.tasks)) throw new Error("Morgen returned no task list. Task status is unknown.");
  return result.data.tasks.filter(
    (task) => !task.deleted && task.progress !== "completed" && task.progress !== "cancelled",
  );
}

export interface TaskInput {
  title: string;
  description?: string;
  due?: string;
  timeZone?: string;
  estimatedDuration?: string;
  priority?: number;
}

function validateTask(input: TaskInput): void {
  title(input.title);
  if (input.priority !== undefined && (!Number.isInteger(input.priority) || input.priority < 0 || input.priority > 9))
    throw new Error("Task priority must be 0–9.");
  if (input.due) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(input.due) || !input.timeZone || /^[+-]/.test(input.timeZone))
      throw new Error("Task due date requires a local date/time and IANA timezone.");
    Temporal.PlainDateTime.from(input.due, {
      overflow: "reject",
    }).toZonedDateTime(input.timeZone, { disambiguation: "reject" });
  }
  if (input.estimatedDuration) {
    const minutes = Temporal.Duration.from(input.estimatedDuration).total({
      unit: "minutes",
    });
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 10080)
      throw new Error("Task estimate must be between 1 and 10080 minutes.");
  }
}

function taskId(task: Task): string {
  if (!task.id || task.deleted) throw new Error("This task is unavailable. Refresh the task list.");
  return task.id;
}

export async function createTask(input: TaskInput): Promise<string> {
  validateTask(input);
  const result = await morgenFetch<{ data: { id: string } }>("/tasks/create", {
    method: "POST",
    body: JSON.stringify({ ...input, title: title(input.title) }),
  });
  if (!result?.data?.id) throw new Error("Creation response did not include a task ID. Check Morgen before retrying.");
  return result.data.id;
}

export async function updateTask(
  task: Task,
  changes: Pick<TaskInput, "title" | "description" | "priority">,
): Promise<void> {
  const id = taskId(task);
  validateTask(changes);
  const patch: Partial<TaskInput> = {};
  if (title(changes.title) !== task.title) patch.title = title(changes.title);
  if (changes.description !== undefined && changes.description !== (task.description ?? ""))
    patch.description = changes.description;
  if (changes.priority !== undefined && changes.priority !== (task.priority ?? 0)) patch.priority = changes.priority;
  if (!Object.keys(patch).length) return;
  await morgenFetch("/tasks/update", {
    method: "POST",
    body: JSON.stringify({ id, ...patch }),
  });
}

export async function closeTask(task: Task): Promise<void> {
  await morgenFetch("/tasks/close", {
    method: "POST",
    body: JSON.stringify({ id: taskId(task) }),
  });
}

export async function deleteTask(task: Task): Promise<void> {
  await morgenFetch("/tasks/delete", {
    method: "POST",
    body: JSON.stringify({ id: taskId(task) }),
  });
}
