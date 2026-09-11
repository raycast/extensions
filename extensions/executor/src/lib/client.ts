import { createHash } from "node:crypto";
import { getPreferenceValues } from "@raycast/api";
import { currentWorkspace } from "./workspaces";
import { forgetPendingApproval, rememberPendingApproval } from "./pending-approvals";
import type {
  Artifact,
  ArtifactSummary,
  Connection,
  ExecutionResult,
  HealthResult,
  Integration,
  Owner,
  ResumeAction,
  ToolSchema,
  ToolSummary,
} from "./types";

interface Preferences {
  apiKey: string;
  baseUrl?: string;
  defaultOwner?: "all" | "user" | "org";
}

const DEFAULT_BASE_URL = "https://executor.sh";

export function preferences(): Preferences {
  return currentWorkspace() ?? getPreferenceValues<Preferences>();
}

/** Origin without a trailing slash, e.g. `https://executor.sh`. */
export function origin(): string {
  const raw = preferences().baseUrl?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_BASE_URL).replace(/\/+$/, "");
}

/** The configured owner scope, or undefined when both scopes are wanted. */
export function defaultOwner(): Owner | undefined {
  const value = preferences().defaultOwner;
  return value === "user" || value === "org" ? value : undefined;
}

/** Non-secret identity used to separate Raycast caches when preferences change. */
export function accountCacheKey(): string {
  return createHash("sha256")
    .update(JSON.stringify([origin(), preferences().apiKey, defaultOwner()]))
    .digest("hex");
}

/** A link into the web console, for `Open in Browser` actions. */
export function webUrl(path = ""): string {
  return `${origin()}${path}`;
}

/**
 * Errors from the API. The server answers failures with a JSON body carrying a
 * `_tag` discriminator, e.g. `{"_tag":"AccountUnauthorized"}`.
 */
export class ExecutorError extends Error {
  constructor(
    readonly status: number,
    readonly tag: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = "ExecutorError";
  }
}

function describe(status: number, tag: string | undefined, body: string): string {
  if (status === 401) {
    return "Executor rejected the API key. Check the key and server URL in this extension's preferences.";
  }
  if (status === 403) return "Your Executor account does not have permission for this operation.";
  if (status === 404) return "Not found on this Executor server.";
  if (status === 410) return "This approval has expired or is no longer available. The call was not retried.";
  if (tag) return `${tag} (HTTP ${status})`;
  const trimmed = body.trim();
  if (trimmed.length > 0) return `HTTP ${status}: ${trimmed.slice(0, 300)}`;
  return `HTTP ${status}`;
}

export async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const { apiKey } = preferences();
  if (!apiKey || apiKey.trim().length === 0) {
    throw new ExecutorError(401, undefined, "No Executor API key configured.");
  }

  const headers: Record<string, string> = {
    // Verified against the platform surface of the API. Note that the
    // `account/*` and `auth/*` routes are session-cookie only and cannot be
    // reached with a key, so this extension never calls them.
    Authorization: `Bearer ${apiKey.trim()}`,
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${origin()}${path}`, { ...init, headers, signal, redirect: "error" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ExecutorError(0, undefined, `Could not reach ${origin()}. ${(error as Error).message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let tag: string | undefined;
    try {
      tag = (JSON.parse(body) as { _tag?: string })._tag;
    } catch {
      tag = undefined;
    }
    throw new ExecutorError(response.status, tag, describe(response.status, tag, body));
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function query(params: Record<string, string | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded.length > 0 ? `?${encoded}` : "";
}

export interface ListToolsOptions {
  query?: string;
  integration?: string;
  owner?: Owner;
  connection?: string;
  includeBlocked?: boolean;
}

/**
 * `GET /api/tools` is unpaginated: on a full catalog it returns every tool in
 * one response (thousands of entries, multiple megabytes). Always pass a
 * `query` or an `integration` so the server narrows the result first.
 */
export function listTools(options: ListToolsOptions = {}, signal?: AbortSignal): Promise<ToolSummary[]> {
  return request<ToolSummary[]>(
    `/api/tools${query({
      query: options.query,
      integration: options.integration,
      owner: options.owner,
      connection: options.connection,
      includeBlocked: options.includeBlocked,
    })}`,
    {},
    signal,
  );
}

export function getToolSchema(address: string, signal?: AbortSignal): Promise<ToolSchema> {
  return request<ToolSchema>(`/api/tools/schema${query({ address })}`, {}, signal);
}

/**
 * The configured integrations. Small enough to fetch whole, and the only place
 * the server's own display name for each integration is available.
 */
export function listIntegrations(signal?: AbortSignal): Promise<Integration[]> {
  return request<Integration[]>("/api/integrations", {}, signal);
}

export function getIntegration(slug: string): Promise<Integration> {
  return request<Integration>(`/api/integrations/${encodeURIComponent(slug)}`);
}

export function updateIntegration(
  slug: string,
  changes: { name?: string; description?: string },
): Promise<Integration> {
  return request<Integration>(`/api/integrations/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

export function listConnections(
  options: { integration?: string; owner?: Owner } = {},
  signal?: AbortSignal,
): Promise<Connection[]> {
  return request<Connection[]>(`/api/connections${query(options)}`, {}, signal);
}

function connectionPath(connection: Pick<Connection, "owner" | "integration" | "name">): string {
  const { owner, integration, name } = connection;
  return `/api/connections/${encodeURIComponent(owner)}/${encodeURIComponent(integration)}/${encodeURIComponent(name)}`;
}

export function checkConnectionHealth(
  connection: Pick<Connection, "owner" | "integration" | "name">,
): Promise<HealthResult> {
  return request<HealthResult>(`${connectionPath(connection)}/health`, { method: "POST" });
}

/** Resyncs the connection's tool list. Returns the tools now exposed by it. */
export function refreshConnection(
  connection: Pick<Connection, "owner" | "integration" | "name">,
): Promise<ToolSummary[]> {
  return request<ToolSummary[]>(`${connectionPath(connection)}/refresh`, { method: "POST" });
}

export async function execute(code: string, autoApprove?: boolean): Promise<ExecutionResult> {
  const scope = accountCacheKey();
  const result = await request<ExecutionResult>("/api/executions", {
    method: "POST",
    body: JSON.stringify({ code, autoApprove: autoApprove ?? null }),
  });
  // The call already happened. Local inbox failure must never become a retryable execution error.
  await rememberPendingApproval(scope, result).catch(() => undefined);
  return result;
}

export async function resumeExecution(
  executionId: string,
  action: ResumeAction,
  content?: unknown,
): Promise<ExecutionResult> {
  const scope = accountCacheKey();
  let result: ExecutionResult;
  try {
    result = await request<ExecutionResult>(`/api/executions/${encodeURIComponent(executionId)}/resume`, {
      method: "POST",
      body: JSON.stringify({ action, content: content ?? null }),
    });
  } catch (error) {
    if (error instanceof ExecutorError && [404, 410].includes(error.status)) {
      await forgetPendingApproval(scope, executionId).catch(() => undefined);
    }
    throw error;
  }
  await forgetPendingApproval(scope, executionId).catch(() => undefined);
  await rememberPendingApproval(scope, result).catch(() => undefined);
  return result;
}

export function listArtifacts(signal?: AbortSignal): Promise<ArtifactSummary[]> {
  return request<ArtifactSummary[]>("/api/artifacts", {}, signal);
}

export function getArtifact(artifactId: string, signal?: AbortSignal): Promise<Artifact> {
  return request<Artifact>(`/api/artifacts/${encodeURIComponent(artifactId)}`, {}, signal);
}

export function renameArtifact(artifactId: string, title: string): Promise<Artifact> {
  return request<Artifact>(`/api/artifacts/${encodeURIComponent(artifactId)}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function removeArtifact(artifactId: string): Promise<{ removed: boolean }> {
  return request<{ removed: boolean }>(`/api/artifacts/${encodeURIComponent(artifactId)}`, { method: "DELETE" });
}
