import { getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";

// CPA management API client. Quota discovery prefers v8 and falls back for older servers.

export type Cooldown = {
  scope: "model" | "credential";
  model_key?: string;
  reason: string;
  remaining_seconds: number;
  /** Epoch ms when the cooldown ends, anchored to when we received it (not the server clock). */
  until: number;
};

export type AuthFile = {
  id: string;
  auth_index: string;
  name: string;
  provider: string;
  label?: string;
  email?: string;
  status: string;
  status_message?: string;
  disabled: boolean;
  unavailable: boolean;
  last_refresh?: string;
  next_retry_after?: string;
  success?: number;
  failed?: number;
  /** null when the server can't observe runtime state. */
  cooldowns?: Cooldown[] | null;
  /** Decoded Codex id_token claims. */
  id_token?: { chatgpt_account_id?: string; plan_type?: string };
  organization_uuid?: string;
  project_id?: string;
  runtime_only?: boolean;
  supports_quota?: boolean;
  quota_provider?: string;
  quota_plugin_id?: string;
};

export type RefreshResult = { id: string; success: boolean; error?: string };

/** Raw upstream response from /api-call, which proxies a request using an account's token. */
export type UpstreamResponse = { status: number; body: unknown };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function baseUrl(): string {
  return readSettings().url;
}

/**
 * Opaque id of the configured server URL and management key. Views capture it when they load and pass it to every
 * call, so a call made after the settings changed fails instead of reaching the new server or using the new key.
 * Cache keys include it too; it's a truncated hash, so the key itself is never stored.
 */
export type ConnectionId = string & { readonly __brand: "ConnectionId" };

export function connectionId(): ConnectionId {
  return readSettings().id;
}

/** Thrown before sending anything when the settings no longer match the connection the caller loaded from. */
export class ConnectionChangedError extends ApiError {
  constructor() {
    super("Server settings changed, reopen the command to continue", 0);
  }
}

/** URL, key and their id from one read of the preferences, so they always belong together. */
function readSettings() {
  const prefs = getPreferenceValues<Preferences>();
  const url = (prefs.baseUrl?.trim() || "http://localhost:8317").replace(/\/+$/, "");
  const id = createHash("sha256")
    .update(JSON.stringify([url, prefs.managementKey]))
    .digest("hex")
    .slice(0, 16) as ConnectionId;
  return { url, managementKey: prefs.managementKey, id };
}

/** Deadline for one management API call, including reading the response body. */
const REQUEST_TIMEOUT_MS = 15_000;

export async function managementRequest<T>(
  connection: ConnectionId,
  method: string,
  path: string,
  body?: unknown,
  version: 0 | 8 = 0,
): Promise<T> {
  const { url, managementKey, id } = readSettings();
  if (id !== connection) throw new ConnectionChangedError();
  // Aborting also fails a pending res.text(), so a body that stops mid-way can't hang the call either.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  let text: string;
  try {
    res = await fetch(`${url}/v${version}/management${path}`, {
      method,
      headers: { Authorization: `Bearer ${managementKey}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    text = await res.text();
  } catch {
    throw controller.signal.aborted
      ? new ApiError(`CLIProxyAPI at ${url} didn't respond within ${REQUEST_TIMEOUT_MS / 1000}s`, 0)
      : new ApiError(`CLIProxyAPI is not reachable at ${url}`, 0);
  } finally {
    clearTimeout(timer);
  }
  const json = text ? safeJson(text) : null;
  if (!res.ok) {
    const message = isRecord(json) && typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return json as T;
}

export async function listAuthFiles(connection: ConnectionId): Promise<AuthFile[]> {
  const res = await compatibleRequest<{ files: AuthFile[] }>(connection, "GET", "/credentials", "/auth-files");
  const receivedAt = Date.now();
  return res.files.map((file) => ({
    id: file.id,
    name: file.name,
    auth_index: String(file.auth_index ?? ""),
    provider: String(file.provider || (file as AuthFile & { type?: string }).type || "other")
      .trim()
      .toLowerCase(),
    label: file.label,
    email: file.email,
    status: file.status,
    status_message: file.status_message,
    disabled: file.disabled,
    unavailable: file.unavailable,
    last_refresh: file.last_refresh,
    next_retry_after: file.next_retry_after,
    success: file.success,
    failed: file.failed,
    cooldowns: file.cooldowns?.map((c) => ({ ...c, until: receivedAt + c.remaining_seconds * 1000 })) ?? null,
    id_token: file.id_token
      ? { chatgpt_account_id: file.id_token.chatgpt_account_id, plan_type: file.id_token.plan_type }
      : undefined,
    organization_uuid: file.organization_uuid,
    project_id: file.project_id,
    runtime_only: file.runtime_only,
    supports_quota: file.supports_quota,
    quota_provider: file.quota_provider,
    quota_plugin_id: file.quota_plugin_id,
  }));
}

/** Force a token refresh for one auth file. */
export async function refreshAuthFile(connection: ConnectionId, file: AuthFile): Promise<void> {
  await managementRequest(connection, "POST", "/auth-files/refresh", { name: file.name, auth_index: file.auth_index });
}

/** Force a token refresh for every enabled auth file. */
export async function refreshAllAuthFiles(connection: ConnectionId): Promise<RefreshResult[]> {
  const res = await managementRequest<{ results: RefreshResult[] | null }>(connection, "POST", "/auth-files/refresh", {
    all: true,
  });
  return res.results ?? [];
}

export async function setAuthFileDisabled(connection: ConnectionId, file: AuthFile, disabled: boolean): Promise<void> {
  await managementRequest(connection, "PATCH", "/auth-files/status", {
    name: file.name,
    auth_index: file.auth_index,
    disabled,
  });
}

/** Clear CLIProxyAPI's local cooldown/quota routing state for an account. Upstream quota is untouched. */
export async function clearCooldown(connection: ConnectionId, authIndex: string): Promise<void> {
  await managementRequest(connection, "POST", "/reset-quota", { auth_index: authIndex });
}

/** Send a request upstream through the proxy; `$TOKEN$` in headers is replaced with the account's access token. */
export async function upstream(
  connection: ConnectionId,
  authIndex: string,
  method: string,
  url: string,
  header: Record<string, string>,
  data?: unknown,
): Promise<UpstreamResponse> {
  const res = await compatibleRequest<{ status_code: number; body: unknown }>(
    connection,
    "POST",
    "/requests/api-call",
    "/api-call",
    {
      auth_index: authIndex,
      method,
      url,
      header,
      data: data === undefined ? undefined : JSON.stringify(data),
    },
  );
  return { status: res.status_code, body: typeof res.body === "string" ? safeJson(res.body) : (res.body ?? null) };
}

/** Prefer v8 while retaining support for CPA servers that predate its route layout. */
const legacyConnections = new Set<ConnectionId>();
async function compatibleRequest<T>(
  connection: ConnectionId,
  method: string,
  current: string,
  legacy: string,
  body?: unknown,
): Promise<T> {
  if (!legacyConnections.has(connection)) {
    try {
      return await managementRequest<T>(connection, method, current, body, 8);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
      // Only credentials discovery establishes that the server itself predates v8.
      if (current === "/credentials") legacyConnections.add(connection);
    }
  }
  return managementRequest<T>(connection, method, legacy, body);
}

/** Credential contents are request-local. Callers extract only the field needed for a quota read. */
export function downloadCredential(connection: ConnectionId, name: string): Promise<unknown> {
  return compatibleRequest(
    connection,
    "GET",
    `/credentials/download?name=${encodeURIComponent(name)}`,
    `/auth-files/download?name=${encodeURIComponent(name)}`,
  );
}

/** Server-selected plugins also support custom providers, without a client-side provider allowlist. */
export async function pluginQuota(
  connection: ConnectionId,
  file: AuthFile | { auth_index: string; quota_plugin_id?: string; quota_provider?: string; provider: string },
): Promise<unknown | null> {
  try {
    if (file.quota_plugin_id) {
      const path = `/plugins/${encodeURIComponent(file.quota_plugin_id)}/quota`;
      return await compatibleRequest(connection, "POST", path, path, { auth_index: file.auth_index });
    }
    // Compatibility for older servers, including declarative probes and plugin discovery.
    return await managementRequest(connection, "POST", "/quota/fetch", {
      auth_index: file.auth_index,
      provider: file.quota_provider || file.provider,
    });
  } catch (error) {
    if (error instanceof ApiError && [404, 501].includes(error.status)) return null;
    throw error;
  }
}

/** One-line outcome of a refresh-all run, e.g. "4 of 5 accounts refreshed". */
export function describeRefresh(results: RefreshResult[]): string {
  if (results.length === 0) return "No accounts to refresh";
  const ok = results.filter((r) => r.success).length;
  return ok === results.length ? `Refreshed ${ok} accounts` : `${ok} of ${results.length} accounts refreshed`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
