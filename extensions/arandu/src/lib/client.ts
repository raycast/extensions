import { getPreferenceValues } from "@raycast/api";

interface Prefs {
  apiToken: string;
  baseUrl?: string;
}

export class AranduError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AranduError";
  }
}

function prefs(): { token: string; baseUrl: string } {
  const p = getPreferenceValues<Prefs>();
  const baseUrl = (p.baseUrl?.trim() || "https://arandu.lvdev.com.br").replace(/\/+$/, "");
  return { token: p.apiToken.trim(), baseUrl };
}

const FRIENDLY: Record<number, string> = {
  401: "Invalid or revoked API token. Create a new one in Arandu under Connections → API Keys.",
  402: "Your Arandu subscription is inactive.",
  403: "Access blocked. Open Arandu in the browser to resolve it (e.g. password change required).",
};

export async function request<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { token, baseUrl } = prefs();
  const { timeoutMs, ...rest } = init ?? {};
  const res = await fetch(`${baseUrl}${path}`, {
    ...rest,
    signal: AbortSignal.timeout(timeoutMs ?? 20_000),
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      "x-arandu-client": "raycast",
      ...(rest.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const serverMsg = typeof data.error === "string" ? data.error : `${res.status} on ${path}`;
    throw new AranduError(FRIENDLY[res.status] ?? serverMsg, res.status);
  }
  return data as T;
}

// --- Shapes (mirror of apps/core responses; fields the extension uses) ---

export interface PlanEvent {
  id: string;
  start: number;
  end: number;
  allDay: boolean;
  title: string;
  origin: string;
  source: string;
  url: string | null;
  location: string | null;
  workBlock?: { id: string; label: string } | null;
}

export interface PlanCandidate {
  id: string;
  title: string;
  kind: string;
  source: string;
  origin: string;
  url: string | null;
  priority?: "urgent" | "high" | "med" | "low";
  scheduledAt?: number | null;
}

export interface TodayResponse {
  dayStart: number;
  now: number;
  events: PlanEvent[];
  allDayEvents: PlanEvent[];
  scheduled: Array<{ candidate: PlanCandidate; start: number; end: number; pinned: boolean }>;
  reminders: Array<{
    id: string;
    title: string;
    fireAt: number;
    recurring: boolean;
    done: boolean;
  }>;
  habitsToday: Array<{
    id: string;
    name: string;
    icon: string | null;
    doneToday: boolean;
  }>;
  unscheduled: PlanCandidate[];
  overdue: Array<{
    id: string;
    title: string;
    source: "arandu" | "jira";
    origin: string;
    url: string | null;
    priority?: "urgent" | "high" | "med" | "low";
    dueAt: number;
  }>;
  completedToday: Array<{
    id: string;
    title: string;
    source: "arandu" | "jira";
    origin: string;
    url: string | null;
    completedAt: number;
  }>;
  failures: Array<{ source: string; error: string }>;
}

export interface AgendaEvent {
  id: string;
  source: "google" | "apple" | "arandu";
  origin: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  url: string | null;
  workBlock?: { id: string; label: string } | null;
}

export interface Habit {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  frequency: "daily" | "weekly" | "flex";
  slots: string[];
  targetValue: number | null;
  unit: string | null;
  category: string | null;
  doneToday: boolean;
  weekCount: number;
  target: number;
  streak: number;
  todayValue: number;
  todaySlots: string[];
}

export const api = {
  today: () => request<TodayResponse>("/api/today"),
  agenda: () =>
    request<{ events: AgendaEvent[]; failures: Array<{ source: string; error: string }> }>(
      "/api/agenda",
    ),
  habits: () => request<{ habits: Habit[] }>("/api/habits"),
  checkHabit: (id: string, done: boolean, slot?: string) =>
    request<Habit>(`/api/habits/${id}/check`, {
      method: "POST",
      body: JSON.stringify({ done, ...(slot ? { slot } : {}) }),
    }),
  completeTask: (id: string) =>
    request<unknown>(`/api/tasks/${encodeURIComponent(id)}/done`, { method: "POST" }),
  completeJiraFromToday: (id: string) =>
    request<unknown>(`/api/task-overrides/${encodeURIComponent(id)}/complete`, {
      method: "PUT",
      body: JSON.stringify({ completed: true }),
    }),
  completeReminder: (id: string) =>
    request<unknown>(`/api/reminders/${id}/complete`, { method: "POST" }),
  createTask: (input: {
    title: string;
    body?: string;
    priority?: "low" | "med" | "high" | "urgent";
    dueAt?: number;
  }) => request<{ id: string }>("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
  createReminder: (input: {
    title: string;
    body?: string;
    nextFireAt: number;
    timezone?: string;
  }) => request<{ id: string }>("/api/reminders", { method: "POST", body: JSON.stringify(input) }),
  ask: (transcript: string) =>
    request<{
      conversationId: string;
      text: string | null;
      question: string | null;
      actionTaken: boolean;
      followUpQuestion: string | null;
    }>("/api/voice", {
      method: "POST",
      body: JSON.stringify({ transcript }),
      // Agent turns can take a while; nginx caps at 120s.
      timeoutMs: 120_000,
    }),
};
