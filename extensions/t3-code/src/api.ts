import {
  EnvironmentInfo,
  OrchestrationProject,
  OrchestrationThread,
  ServerConfig,
  ServerProvider,
  ServerProviderAuth,
  ThreadSummary,
} from "./types";
import { streamSnapshotProjection } from "./streaming-snapshot";
import {
  writeCachedProjectOverview,
  writeCachedProjectThreads,
  writeCachedProviderCatalog,
} from "./snapshot-cache";

const FETCH_TIMEOUT_MS = 15000;
const PROBE_TIMEOUT_MS = 5000;
const WS_CONFIG_TIMEOUT_MS = 5000;

// In-memory shell data younger than this is fresh enough to satisfy a
// fetch triggered by pushing a new screen, so navigation never waits on
// the network for data the previous screen just loaded.
export const SHELL_FRESH_MS = 2_500;
// Polls from stacked screens within this window collapse into one request.
export const SHELL_POLL_COALESCE_MS = 1_000;
// Upper bound for synchronous peeks used to render a pushed screen instantly;
// a network revalidation always follows.
const SHELL_PEEK_MAX_AGE_MS = 60_000;
const PROVIDER_CATALOG_FRESH_MS = 60_000;

const shellSnapshotUnsupported = new Set<string>();

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function isJsonResponse(resp: Response): boolean {
  return (
    resp.headers.get("content-type")?.includes("application/json") ?? false
  );
}

async function parseOptionalJson<T>(resp: Response): Promise<T | null> {
  if (!isJsonResponse(resp)) return null;
  try {
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

function ensureJsonResponse(resp: Response): void {
  if (!isJsonResponse(resp)) {
    throw new ApiError("parse", "Unexpected non-JSON response from T3 Code");
  }
}

export async function probeEnvironment(
  baseUrl: string,
): Promise<EnvironmentInfo> {
  const resp = await fetchWithTimeout(
    `${baseUrl}/.well-known/t3/environment`,
    {},
    PROBE_TIMEOUT_MS,
  );
  if (!resp.ok) {
    throw new Error(`Server returned ${resp.status}`);
  }
  return (await resp.json()) as EnvironmentInfo;
}

async function rawFetchPath(
  baseUrl: string,
  accessToken: string,
  path: string,
  options: { allowNotFound?: boolean } = {},
): Promise<Response> {
  const resp = await fetchWithTimeout(
    `${baseUrl}${path}`,
    { headers: authHeaders(accessToken) },
    FETCH_TIMEOUT_MS,
  );
  if (resp.status === 401) {
    throw new ApiError("unauthorized", "Session expired — re-pair this device");
  }
  if (resp.status === 403) {
    throw new ApiError("forbidden", "Access denied — check device permissions");
  }
  if (options.allowNotFound && resp.status === 404) {
    return resp;
  }
  if (!resp.ok) {
    throw new ApiError("server", `Server error (${resp.status})`);
  }
  return resp;
}

async function fetchServerConfigViaWebSocket(
  baseUrl: string,
  accessToken: string,
): Promise<ServerConfig> {
  const ticketResp = await fetchWithTimeout(
    `${baseUrl}/api/auth/websocket-ticket`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
    },
    WS_CONFIG_TIMEOUT_MS,
  );
  if (ticketResp.status === 401) {
    throw new ApiError("unauthorized", "Session expired — re-pair this device");
  }
  if (ticketResp.status === 403) {
    throw new ApiError("forbidden", "Access denied — check device permissions");
  }
  if (!ticketResp.ok) {
    throw new ApiError(
      "server",
      `WebSocket ticket failed (${ticketResp.status})`,
    );
  }
  const ticketBody = await parseOptionalJson<{ ticket?: string }>(ticketResp);
  if (!ticketBody?.ticket) {
    throw new ApiError("parse", "WebSocket ticket response was invalid");
  }

  const wsUrl = new URL(baseUrl);
  wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
  wsUrl.pathname = "/ws";
  wsUrl.search = "";
  wsUrl.searchParams.set("wsTicket", ticketBody.ticket);

  return new Promise<ServerConfig>((resolve, reject) => {
    const WebSocketCtor = globalThis.WebSocket;
    if (!WebSocketCtor) {
      reject(
        new ApiError("server", "WebSocket is not available in this runtime"),
      );
      return;
    }

    const requestId = "1";
    const socket = new WebSocketCtor(wsUrl.toString());
    const timer = setTimeout(() => {
      try {
        socket.close();
      } catch {
        // Ignore close failures while timing out.
      }
      reject(new ApiError("offline", "Server config WebSocket timed out"));
    }, WS_CONFIG_TIMEOUT_MS);

    const finish = (config: ServerConfig) => {
      clearTimeout(timer);
      try {
        socket.close(1000);
      } catch {
        // Ignore close failures after a successful response.
      }
      resolve(config);
    };

    const fail = (error: Error) => {
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Ignore close failures after an error.
      }
      reject(error);
    };

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          _tag: "Request",
          id: requestId,
          tag: "server.getConfig",
          payload: {},
          headers: [],
        }),
      );
      socket.send(JSON.stringify({ _tag: "Eof" }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const messages = parseWebSocketRpcMessages(event.data);
        for (const message of messages) {
          if (!message || typeof message !== "object") continue;
          const source = message as Record<string, unknown>;
          if (source._tag === "Pong") continue;
          if (source._tag !== "Exit" || source.requestId !== requestId)
            continue;
          const exit = source.exit as Record<string, unknown> | undefined;
          if (exit?._tag !== "Success") {
            fail(new ApiError("server", "Server config RPC failed"));
            return;
          }
          const value = exit.value as ServerConfig;
          if (!value || !Array.isArray(value.providers)) {
            fail(new ApiError("parse", "Server config response was invalid"));
            return;
          }
          finish(value);
          return;
        }
      } catch (error) {
        fail(
          error instanceof Error
            ? error
            : new ApiError("parse", "Server config response was invalid"),
        );
      }
    });

    socket.addEventListener("error", () => {
      fail(new ApiError("offline", "Unable to connect to server WebSocket"));
    });
  });
}

function parseWebSocketRpcMessages(data: unknown): unknown[] {
  const text =
    typeof data === "string"
      ? data
      : data instanceof ArrayBuffer
        ? new TextDecoder().decode(data)
        : String(data);
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.includes("\n")) {
    return trimmed
      .split(/\n+/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as unknown);
  }
  const parsed = JSON.parse(trimmed) as unknown;
  return Array.isArray(parsed) ? parsed : [parsed];
}

type ShellSnapshotResponse = {
  projects: Array<Omit<OrchestrationProject, "deletedAt">>;
  threads: ShellThread[];
};

export type ShellThread = Omit<
  OrchestrationThread,
  "messages" | "activities" | "checkpoints" | "deletedAt"
> & { deletedAt?: string | null };

export interface ShellData {
  projects: OrchestrationProject[];
  threads: ShellThread[];
}

export interface ProjectOverview {
  projects: OrchestrationProject[];
  threadCounts: Map<string, number>;
  hasRunning: Map<string, boolean>;
}

export interface ProjectThreadsData {
  threads: ThreadSummary[];
  project: OrchestrationProject | null;
}

let shellMemory: {
  baseUrl: string;
  data: ShellData;
  fetchedAt: number;
} | null = null;
let shellInflight: { baseUrl: string; promise: Promise<ShellData> } | null =
  null;

function peekShell(baseUrl: string, maxAgeMs: number): ShellData | null {
  if (!shellMemory || shellMemory.baseUrl !== baseUrl) return null;
  if (Date.now() - shellMemory.fetchedAt > maxAgeMs) return null;
  return shellMemory.data;
}

// Single shared fetch of the shell snapshot: concurrent callers (stacked
// screens polling at the same time) await one request instead of issuing
// parallel snapshot downloads.
function getShellData(
  baseUrl: string,
  accessToken: string,
  maxAgeMs: number,
): Promise<ShellData> {
  const fresh = peekShell(baseUrl, maxAgeMs);
  if (fresh) return Promise.resolve(fresh);
  if (shellInflight?.baseUrl === baseUrl) return shellInflight.promise;

  const promise: Promise<ShellData> = loadShellData(baseUrl, accessToken)
    .then((data) => {
      shellMemory = { baseUrl, data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      if (shellInflight?.promise === promise) shellInflight = null;
    });
  shellInflight = { baseUrl, promise };
  return promise;
}

async function loadShellData(
  baseUrl: string,
  accessToken: string,
): Promise<ShellData> {
  let data: ShellData | null = null;

  if (!shellSnapshotUnsupported.has(baseUrl)) {
    const resp = await rawFetchPath(
      baseUrl,
      accessToken,
      "/api/orchestration/shell-snapshot",
      { allowNotFound: true },
    );
    const snap = await parseOptionalJson<ShellSnapshotResponse>(resp);
    if (resp.status === 404 || !snap) {
      shellSnapshotUnsupported.add(baseUrl);
    } else {
      data = {
        projects: snap.projects.map((project) => ({
          ...project,
          deletedAt: null,
        })),
        threads: snap.threads,
      };
    }
  }

  if (!data) {
    // Older T3 Code builds without the shell endpoint: stream the full
    // snapshot, keeping only shell-level fields.
    const resp = await rawFetchPath(
      baseUrl,
      accessToken,
      "/api/orchestration/snapshot",
    );
    ensureJsonResponse(resp);
    const snap = await streamSnapshotProjection(resp.body);
    data = {
      projects: snap.projects.filter((project) => !project.deletedAt),
      threads: snap.threads.filter((thread) => !thread.deletedAt),
    };
  }

  writeCachedProjectOverview(baseUrl, projectOverview(data));
  return data;
}

function projectOverview(data: ShellData): ProjectOverview {
  const threadCounts = new Map<string, number>();
  const hasRunning = new Map<string, boolean>();
  for (const thread of data.threads) {
    if (thread.archivedAt) continue;
    const pid = thread.projectId;
    threadCounts.set(pid, (threadCounts.get(pid) ?? 0) + 1);
    if (
      thread.session?.status === "running" ||
      thread.session?.status === "starting" ||
      thread.latestTurn?.state === "running"
    ) {
      hasRunning.set(pid, true);
    }
  }
  return { projects: data.projects, threadCounts, hasRunning };
}

function projectThreads(
  data: ShellData,
  projectId: string,
): ProjectThreadsData {
  const project = data.projects.find((p) => p.id === projectId) ?? null;
  const threads = data.threads
    .filter((t) => t.projectId === projectId && !t.archivedAt)
    .map(toThreadSummary)
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  return { threads, project };
}

function toThreadSummary(thread: ShellThread): ThreadSummary {
  return {
    id: thread.id,
    projectId: thread.projectId,
    title: thread.title,
    modelSelection: thread.modelSelection,
    runtimeMode: thread.runtimeMode,
    interactionMode: thread.interactionMode,
    branch: thread.branch,
    sessionStatus: thread.session?.status ?? null,
    sessionLastError: thread.session?.lastError ?? null,
    latestTurnState: thread.latestTurn?.state ?? null,
    hasPendingApprovals: thread.hasPendingApprovals,
    hasPendingUserInput: thread.hasPendingUserInput,
    updatedAt: thread.updatedAt,
  };
}

export async function fetchProjects(
  baseUrl: string,
  accessToken: string,
  maxAgeMs = 0,
): Promise<ProjectOverview> {
  return projectOverview(await getShellData(baseUrl, accessToken, maxAgeMs));
}

export function peekProjectThreads(
  baseUrl: string,
  projectId: string,
): ProjectThreadsData | null {
  const data = peekShell(baseUrl, SHELL_PEEK_MAX_AGE_MS);
  return data ? projectThreads(data, projectId) : null;
}

export async function fetchProjectThreads(
  baseUrl: string,
  accessToken: string,
  projectId: string,
  maxAgeMs = 0,
): Promise<ProjectThreadsData> {
  const data = await getShellData(baseUrl, accessToken, maxAgeMs);
  const result = projectThreads(data, projectId);
  writeCachedProjectThreads(baseUrl, projectId, result);
  return result;
}

export async function fetchThreadSummary(
  baseUrl: string,
  accessToken: string,
  threadId: string,
  maxAgeMs = 0,
): Promise<ThreadSummary | null> {
  const data = await getShellData(baseUrl, accessToken, maxAgeMs);
  const thread = data.threads.find((t) => t.id === threadId);
  return thread ? toThreadSummary(thread) : null;
}

let providerMemory: {
  baseUrl: string;
  providers: ServerProvider[];
  fetchedAt: number;
} | null = null;

export async function fetchServerProviders(
  baseUrl: string,
  accessToken: string,
): Promise<ServerProvider[] | null> {
  if (
    providerMemory?.baseUrl === baseUrl &&
    Date.now() - providerMemory.fetchedAt < PROVIDER_CATALOG_FRESH_MS
  ) {
    return providerMemory.providers;
  }
  try {
    const config = await fetchServerConfigViaWebSocket(baseUrl, accessToken);
    const providers = config.providers
      .map(normalizeProvider)
      .filter((provider): provider is ServerProvider => provider !== null);
    providerMemory = { baseUrl, providers, fetchedAt: Date.now() };
    writeCachedProviderCatalog(baseUrl, providers);
    return providers;
  } catch {
    return null;
  }
}

export async function dispatch(
  baseUrl: string,
  accessToken: string,
  command: Record<string, unknown>,
): Promise<void> {
  const resp = await fetchWithTimeout(
    `${baseUrl}/api/orchestration/dispatch`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(command),
    },
    FETCH_TIMEOUT_MS,
  );

  if (resp.status === 401) {
    throw new ApiError("unauthorized", "Session expired — re-pair this device");
  }
  if (resp.status === 403) {
    throw new ApiError("forbidden", "Access denied — check device permissions");
  }
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new ApiError(
      "server",
      `Dispatch failed (${resp.status}): ${errText}`,
    );
  }
}

export class ApiError extends Error {
  constructor(
    public code: "unauthorized" | "forbidden" | "server" | "offline" | "parse",
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function classifyError(err: unknown): {
  code: "unauthorized" | "forbidden" | "server" | "offline" | "parse";
  message: string;
} {
  if (err instanceof ApiError) {
    return { code: err.code, message: err.message };
  }
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return {
        code: "offline",
        message: "Connection timed out — is T3 Code running?",
      };
    }
    if (
      err.message.includes("fetch failed") ||
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("network")
    ) {
      return {
        code: "offline",
        message: "Cannot reach server — check URL and network",
      };
    }
    return { code: "server", message: err.message };
  }
  return { code: "server", message: "Unknown error" };
}

export function nextPollInterval(
  retryCount: number,
  isRunning: boolean,
): number {
  if (retryCount === 0) return isRunning ? 3_000 : 30_000;
  if (retryCount === 1) return 5_000;
  if (retryCount === 2) return 10_000;
  if (retryCount === 3) return 20_000;
  return 30_000;
}

function normalizeProvider(value: unknown): ServerProvider | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (
    typeof source.instanceId !== "string" ||
    typeof source.driver !== "string" ||
    !Array.isArray(source.models)
  ) {
    return null;
  }

  const models = source.models
    .map((model) => {
      if (!model || typeof model !== "object") return null;
      const modelSource = model as Record<string, unknown>;
      if (typeof modelSource.slug !== "string") return null;
      return {
        slug: modelSource.slug,
        name:
          typeof modelSource.name === "string"
            ? modelSource.name
            : modelSource.slug,
        ...(typeof modelSource.shortName === "string"
          ? { shortName: modelSource.shortName }
          : {}),
        ...(typeof modelSource.subProvider === "string"
          ? { subProvider: modelSource.subProvider }
          : {}),
        ...(typeof modelSource.isCustom === "boolean"
          ? { isCustom: modelSource.isCustom }
          : {}),
      };
    })
    .filter((model): model is NonNullable<typeof model> => model !== null);

  const authObj =
    source.auth && typeof source.auth === "object"
      ? (source.auth as Record<string, unknown>)
      : null;
  const authStatus =
    authObj && "status" in authObj && typeof authObj.status === "string"
      ? authObj.status
      : null;

  return {
    instanceId: source.instanceId,
    driver: source.driver,
    ...(typeof source.displayName === "string"
      ? { displayName: source.displayName }
      : {}),
    enabled: source.enabled !== false,
    installed: source.installed !== false,
    ...(authStatus
      ? { auth: { status: authStatus as ServerProviderAuth["status"] } }
      : {}),
    ...(typeof source.status === "string" ? { status: source.status } : {}),
    models,
  };
}
