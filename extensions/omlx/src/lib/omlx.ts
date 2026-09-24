import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface OmlxModelStatus {
  id: string;
  model_type: "vlm" | "llm";
  engine_type: string;
  config_model_type: string;
  loaded: boolean;
  is_loading: boolean;
  pinned: boolean;
  is_helper: boolean;
  is_hidden: boolean;
  is_favorite: boolean;
  thinking_default: boolean;
  max_context_window: number;
  max_tokens: number;
  estimated_size: number;
  actual_size: number;
  model_path: string;
}

export interface OmlxModelsStatusResponse {
  models: OmlxModelStatus[];
}

export interface OmlxServerStatus {
  version: string;
  uptime_seconds: number;
  models_discovered: number;
  models_loaded: number;
  models_loading: number;
  default_model: string;
  loaded_models: string[];
  total_requests: number;
  active_requests: number;
  waiting_requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cached_tokens: number;
  cache_efficiency: number;
  avg_prefill_tps: number;
  avg_generation_tps: number;
  model_memory_used: number;
  model_memory_max: number;
  model_memory_used_formatted: string;
  model_memory_max_formatted: string;
}

export interface OmlxHealthResponse {
  status: string;
  engine_pool?: {
    model_count: number;
    loaded_count: number;
    memory_ceiling: number;
    current_model_memory: number;
  };
}

function getBaseUrl(): string {
  const { serverUrl } = getPreferenceValues<ExtensionPreferences>();
  return serverUrl.replace(/\/v1\/?$/, "");
}

function getV1Url(): string {
  const { serverUrl } = getPreferenceValues<ExtensionPreferences>();
  return serverUrl.replace(/\/?$/, "");
}

function getApiKey(): string {
  const { apiKey } = getPreferenceValues<ExtensionPreferences>();
  return apiKey;
}

export function isOmlxInstalled(): boolean {
  const settingsPath = join(homedir(), ".omlx", "settings.json");
  return existsSync(settingsPath);
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
  };
}

let adminSessionCookie: string | null = null;

async function getAdminSession(): Promise<string> {
  if (adminSessionCookie) return adminSessionCookie;

  const response = await fetch(`${getBaseUrl()}/admin/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: getApiKey() }),
  });
  if (!response.ok) {
    throw new Error("Failed to authenticate with oMLX admin API");
  }

  const setCookie = response.headers.get("set-cookie");
  const match = setCookie?.match(/omlx_admin_session=([^;]+)/);
  if (!match) {
    throw new Error("No admin session cookie returned");
  }

  adminSessionCookie = match[1];
  return adminSessionCookie;
}

async function adminHeaders(): Promise<Record<string, string>> {
  const session = await getAdminSession();
  return {
    "Content-Type": "application/json",
    Cookie: `omlx_admin_session=${session}`,
  };
}

export async function fetchHealth(): Promise<OmlxHealthResponse> {
  const response = await fetch(`${getBaseUrl()}/health`, {
    signal: AbortSignal.timeout(3000),
  });
  return response.json() as Promise<OmlxHealthResponse>;
}

export async function isServerRunning(): Promise<boolean> {
  try {
    const health = await fetchHealth();
    return health.status === "healthy";
  } catch {
    return false;
  }
}

export async function fetchModelsStatus(): Promise<OmlxModelStatus[]> {
  const response = await fetch(`${getV1Url()}/models/status`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`oMLX returned ${response.status}: ${response.statusText}`);
  }
  const data = (await response.json()) as OmlxModelsStatusResponse;
  return data.models;
}

export async function fetchServerStatus(): Promise<OmlxServerStatus> {
  const response = await fetch(`${getBaseUrl()}/api/status`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    throw new Error(`oMLX returned ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<OmlxServerStatus>;
}

export async function loadModel(modelId: string): Promise<void> {
  const response = await fetch(
    `${getV1Url()}/models/${encodeURIComponent(modelId)}/load`,
    {
      method: "POST",
      headers: authHeaders(),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to load model: ${text.slice(0, 200)}`);
  }
}

export async function unloadModel(modelId: string): Promise<void> {
  const response = await fetch(
    `${getV1Url()}/models/${encodeURIComponent(modelId)}/unload`,
    {
      method: "POST",
      headers: authHeaders(),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to unload model: ${text.slice(0, 200)}`);
  }
}

export async function updateModelSettings(
  modelId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/admin/api/models/${encodeURIComponent(modelId)}/settings`,
    {
      method: "PUT",
      headers: await adminHeaders(),
      body: JSON.stringify(settings),
    },
  );
  if (!response.ok) {
    if (response.status === 401) adminSessionCookie = null;
    const text = await response.text();
    throw new Error(`Failed to update settings: ${text.slice(0, 200)}`);
  }
}

export async function deleteModel(modelId: string): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/admin/api/hf/models/${encodeURIComponent(modelId)}`,
    {
      method: "DELETE",
      headers: await adminHeaders(),
    },
  );
  if (!response.ok) {
    if (response.status === 401) adminSessionCookie = null;
    const text = await response.text();
    throw new Error(`Failed to delete model: ${text.slice(0, 200)}`);
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatModelName(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/(\d)bit/i, "$1-bit")
    .replace(/(\d)(B)\b/g, "$1$2")
    .replace(/\bmtp\b/i, "MTP")
    .replace(/\bmlx\b/i, "MLX");
}
