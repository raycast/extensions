// Test helpers: a scripted fetch replacement and an in-memory key-value store.
import { KeitoApi } from "./api";
import { FetchLike } from "./http";
import { KeyValueStore } from "./session";

export const TEST_TOKEN = "kto_FAKE_test_secret_value_123";
export const TEST_ACCOUNT = "cmcompany0001";

export interface MockResponse {
  status?: number;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
}

export interface RecordedCall {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body?: unknown;
}

type Handler = MockResponse | Error | ((call: RecordedCall) => MockResponse | Error);

/**
 * Routes are matched in order by "METHOD /path" (path without query). Each route can hold a queue
 * of responses; the last one repeats.
 */
export function mockFetch(routes: Record<string, Handler | Handler[]>) {
  const calls: RecordedCall[] = [];
  const queues = new Map(Object.entries(routes).map(([k, v]) => [k, Array.isArray(v) ? [...v] : [v]]));

  const fetch: FetchLike = async (url, init) => {
    const parsed = new URL(url);
    const call: RecordedCall = {
      method: init.method,
      url: parsed,
      headers: init.headers,
      body: init.body ? JSON.parse(init.body) : undefined,
    };
    calls.push(call);
    const key = `${init.method} ${parsed.pathname}`;
    const queue = queues.get(key);
    if (!queue) throw new Error(`Unexpected request: ${key}`);
    let handler = queue.length > 1 ? queue.shift()! : queue[0];
    if (typeof handler === "function") handler = handler(call);
    if (handler instanceof Error) throw handler;
    const status = handler.status ?? 200;
    const headers = Object.fromEntries(Object.entries(handler.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    const text = handler.rawBody ?? (handler.body === undefined ? "" : JSON.stringify(handler.body));
    return {
      status,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      text: async () => text,
    };
  };
  return { fetch, calls };
}

export function makeApi(
  routes: Record<string, Handler | Handler[]>,
  options: { perPage?: number; maxPages?: number } = {},
) {
  const { fetch, calls } = mockFetch(routes);
  const sleeps: number[] = [];
  const api = new KeitoApi({
    token: TEST_TOKEN,
    accountId: TEST_ACCOUNT,
    fetch,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    ...options,
  });
  return { api, calls, sleeps };
}

/** A mocked paginated response with the standard API v2 envelope. */
export function page<T>(key: string, items: T[], next: string | null = null): MockResponse {
  return {
    body: { [key]: items, page: 1, per_page: 100, total_pages: 1, total_entries: items.length, links: { next } },
  };
}

export function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async getItem<T>(key: string) {
      return data.get(key) as T | undefined;
    },
    async setItem(key: string, value: string | number | boolean) {
      data.set(key, String(value));
    },
    async removeItem(key: string) {
      data.delete(key);
    },
    async allItems() {
      return Object.fromEntries(data);
    },
  };
}

export function rawEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "cmentry0001",
    user: { id: "cmuser0001", name: "Ada Lovelace" },
    project: { id: "cmproject0001", name: "Website", code: "WEB" },
    task: { id: "cmtask0001", name: "Development" },
    client: { id: "cmclient0001", name: "Acme" },
    spent_date: "2026-10-15",
    hours: 1.5,
    notes: "Build adapter",
    is_running: false,
    timer_started_at: null,
    started_time: "09:00",
    ended_time: "10:30",
    is_locked: false,
    is_closed: false,
    is_billed: false,
    billable: true,
    approval_status: "unsubmitted",
    source: "api",
    created_at: "2026-10-15T09:00:00Z",
    updated_at: "2026-10-15T10:30:00Z",
    ...overrides,
  };
}

export const fullAccessMe = {
  id: "cmuser0001",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  roles: ["member"],
  user_type: "human",
  company: { id: TEST_ACCOUNT, name: "Acme Consulting" },
};

export const readOnlyMe = {
  id: "cmuser0001",
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  is_active: true,
  is_contractor: false,
  roles: ["member"],
  capabilities: { can_read_own_time_entries: true, can_read_projects: true },
};
