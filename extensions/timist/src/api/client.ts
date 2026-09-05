import { preferences } from "../lib/preferences";
import { Context, CreateContextInput, CreateTimerInput, Project, Tag, Timer, Today } from "./types";

const CLIENT_VERSION = "1.0.0";
const DEFAULT_BASE_URL = "https://timist.app/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly retryAfterSeconds?: number;

  constructor(status: number, type: string, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.type = type;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function systemTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

interface RequestOptions {
  query?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T | null> {
  const { apiKey, baseUrl } = preferences();
  const base = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `timist-raycast/${CLIENT_VERSION}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    let type = "internal_error";
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: { type?: string; message?: string } };
      if (body.error?.type) type = body.error.type;
      if (body.error?.message) message = body.error.message;
    } catch {
      // non-JSON error body
    }
    const retryAfter = Number(response.headers.get("Retry-After") ?? "");
    throw new ApiError(response.status, type, message, Number.isFinite(retryAfter) ? retryAfter : undefined);
  }

  return (await response.json()) as T;
}

async function json<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const result = await request<T>(method, path, options);
  if (result === null) {
    throw new ApiError(500, "internal_error", "Unexpected empty response");
  }
  return result;
}

function compact(input: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && !(Array.isArray(value) && value.length === 0)),
  );
}

export function getToday(): Promise<Today> {
  return json<Today>("GET", "/today");
}

export function getActiveTimer(): Promise<Timer | null> {
  return request<Timer>("GET", "/timers/active");
}

export function createTimer(input: CreateTimerInput): Promise<Timer> {
  return json<Timer>("POST", "/timers", {
    body: { ...compact(input), started_at: new Date().toISOString(), timezone: systemTimezone() },
  });
}

export function startTimer(id: string): Promise<{ timers: Timer[] }> {
  return json<{ timers: Timer[] }>("POST", `/timers/${id}/start`);
}

export function stopTimer(id: string): Promise<Timer> {
  return json<Timer>("POST", `/timers/${id}/stop`);
}

export function deleteTimer(id: string): Promise<null> {
  return request<null>("DELETE", `/timers/${id}`);
}

export function getContexts(q?: string): Promise<Context[]> {
  return json<Context[]>("GET", "/contexts", { query: { q } });
}

export function getActiveContext(): Promise<Context | null> {
  return request<Context>("GET", "/contexts/active");
}

export function createContext(input: CreateContextInput): Promise<Context> {
  return json<Context>("POST", "/contexts", { body: { ...compact(input), timezone: systemTimezone() } });
}

export function stopContext(id: string): Promise<Context> {
  return json<Context>("POST", `/contexts/${id}/stop`);
}

export function getProjects(): Promise<Project[]> {
  return json<Project[]>("GET", "/projects");
}

export function getTags(): Promise<Tag[]> {
  return json<Tag[]>("GET", "/tags");
}
