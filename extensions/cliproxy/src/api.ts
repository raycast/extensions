import { getPreferenceValues } from "@raycast/api";

// Thin client for the CLIProxyAPI management API (/v0/management).

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
  const { baseUrl } = getPreferenceValues<Preferences>();
  return (baseUrl?.trim() || "http://localhost:8317").replace(/\/+$/, "");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { managementKey } = getPreferenceValues<Preferences>();
  const url = `${baseUrl()}/v0/management${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${managementKey}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`CLIProxyAPI is not reachable at ${baseUrl()}`, 0);
  }
  const text = await res.text();
  const json = text ? safeJson(text) : null;
  if (!res.ok) {
    const message = isRecord(json) && typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return json as T;
}

export async function listAuthFiles(): Promise<AuthFile[]> {
  const res = await request<{ files: AuthFile[] }>("GET", "/auth-files");
  const receivedAt = Date.now();
  return res.files.map((file) => ({
    ...file,
    auth_index: String(file.auth_index ?? ""),
    cooldowns: file.cooldowns?.map((c) => ({ ...c, until: receivedAt + c.remaining_seconds * 1000 })) ?? null,
  }));
}

/** Force a token refresh for one auth file. */
export async function refreshAuthFile(file: AuthFile): Promise<void> {
  await request("POST", "/auth-files/refresh", { name: file.name, auth_index: file.auth_index });
}

/** Force a token refresh for every enabled auth file. */
export async function refreshAllAuthFiles(): Promise<RefreshResult[]> {
  const res = await request<{ results: RefreshResult[] | null }>("POST", "/auth-files/refresh", { all: true });
  return res.results ?? [];
}

export async function setAuthFileDisabled(file: AuthFile, disabled: boolean): Promise<void> {
  await request("PATCH", "/auth-files/status", { name: file.name, auth_index: file.auth_index, disabled });
}

/** Clear CLIProxyAPI's local cooldown/quota routing state for an account. Upstream quota is untouched. */
export async function clearCooldown(authIndex: string): Promise<void> {
  await request("POST", "/reset-quota", { auth_index: authIndex });
}

/** Send a request upstream through the proxy; `$TOKEN$` in headers is replaced with the account's access token. */
export async function upstream(
  authIndex: string,
  method: string,
  url: string,
  header: Record<string, string>,
  data?: unknown,
): Promise<UpstreamResponse> {
  const res = await request<{ status_code: number; body: string }>("POST", "/api-call", {
    auth_index: authIndex,
    method,
    url,
    header,
    data: data === undefined ? undefined : JSON.stringify(data),
  });
  return { status: res.status_code, body: res.body ? safeJson(res.body) : null };
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
