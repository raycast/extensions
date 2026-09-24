import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
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

export function getDashboardUrl(params?: Record<string, string>): string {
  const base = `${getBaseUrl()}/admin/dashboard`;
  if (!params) return base;
  const search = new URLSearchParams(params).toString();
  return `${base}?${search}`;
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

async function adminFetch(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: await adminHeaders(),
  });
  if (response.status === 401) {
    adminSessionCookie = null;
    return fetch(url, { ...init, headers: await adminHeaders() });
  }
  return response;
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

export interface AdminStats {
  avg_prefill_tps: number;
  avg_generation_tps: number;
  total_requests: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_cached_tokens: number;
  cache_efficiency: number;
  total_tokens_served: number;
  uptime_seconds: number;
}

export async function fetchAdminStats(
  scope: "session" | "alltime" = "session",
  modelId?: string,
): Promise<AdminStats> {
  const params = new URLSearchParams({ scope });
  if (modelId) params.set("model", modelId);
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/stats?${params}`,
    { method: "GET" },
  );
  if (!response.ok) {
    throw new Error("Failed to fetch stats");
  }
  return response.json() as Promise<AdminStats>;
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
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/models/${encodeURIComponent(modelId)}/settings`,
    { method: "PUT", body: JSON.stringify(settings) },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update settings: ${text.slice(0, 200)}`);
  }
}

export async function deleteModel(modelId: string): Promise<void> {
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/hf/models/${encodeURIComponent(modelId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to delete model: ${text.slice(0, 200)}`);
  }
}

export interface HfSearchResult {
  repo_id: string;
  name: string;
  downloads: number;
  likes: number;
  trending_score: number;
  size: number;
  size_formatted: string;
  params: number;
  params_formatted: string;
}

export interface HfTask {
  task_id: string;
  repo_id: string;
  status: "pending" | "downloading" | "completed" | "failed" | "cancelled";
  progress: number;
  total_size: number;
  downloaded_size: number;
  error: string;
  created_at: number;
  started_at: number;
  completed_at: number;
  retry_count: number;
}

export interface HfLocalModel {
  name: string;
  path: string;
  display_name: string;
  size: number;
  size_formatted: string;
}

export async function fetchLocalModels(): Promise<HfLocalModel[]> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/hf/models`, {
    method: "GET",
  });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as
    { models: HfLocalModel[] } | HfLocalModel[];
  return Array.isArray(data) ? data : (data.models ?? []);
}

export interface RecommendedModels {
  trending: HfSearchResult[];
  popular: HfSearchResult[];
}

export async function fetchRecommendedModels(): Promise<RecommendedModels> {
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/hf/recommended`,
    { method: "GET" },
  );
  if (!response.ok) {
    return { trending: [], popular: [] };
  }
  const data = (await response.json()) as RecommendedModels;
  return { trending: data.trending ?? [], popular: data.popular ?? [] };
}

export async function reloadModels(): Promise<string> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/reload`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to reload models");
  }
  const data = (await response.json()) as { message: string };
  return data.message;
}

export interface UpdateCheckResponse {
  update_available: boolean;
  latest_version: string | null;
  release_url: string | null;
  update_channel: string;
}

export async function searchHfModels(
  query: string,
  limit = 20,
  mlxOnly = true,
): Promise<HfSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    mlx_only: String(mlxOnly),
  });
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/hf/search?${params}`,
    { method: "GET" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search failed: ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { models: HfSearchResult[] };
  return data.models;
}

export async function startHfDownload(repoId: string): Promise<HfTask> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/hf/download`, {
    method: "POST",
    body: JSON.stringify({ repo_id: repoId }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Download failed: ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { task: HfTask };
  return data.task;
}

export async function fetchHfTasks(): Promise<HfTask[]> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/hf/tasks`, {
    method: "GET",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch tasks: ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { tasks: HfTask[] };
  return data.tasks;
}

export async function cancelHfDownload(taskId: string): Promise<void> {
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/hf/cancel/${encodeURIComponent(taskId)}`,
    { method: "POST" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cancel failed: ${text.slice(0, 200)}`);
  }
}

export async function retryHfDownload(taskId: string): Promise<void> {
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/hf/retry/${encodeURIComponent(taskId)}`,
    { method: "POST" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Retry failed: ${text.slice(0, 200)}`);
  }
}

export async function removeHfTask(taskId: string): Promise<void> {
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/hf/task/${encodeURIComponent(taskId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Remove failed: ${text.slice(0, 200)}`);
  }
}

export async function searchMsModels(
  query: string,
  limit = 20,
): Promise<HfSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/ms/search?${params}`,
    { method: "GET" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search failed: ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { models: HfSearchResult[] };
  return data.models;
}

export async function startMsDownload(modelId: string): Promise<HfTask> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/ms/download`, {
    method: "POST",
    body: JSON.stringify({ model_id: modelId }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Download failed: ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { task: HfTask };
  return data.task;
}

export interface OmlxLogs {
  logs: string;
  total_lines: number;
  log_file: string;
  available_files: string[];
}

export async function fetchLogs(): Promise<OmlxLogs> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/logs`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch logs");
  }
  return response.json() as Promise<OmlxLogs>;
}

let updateCheckResult: UpdateCheckResponse | null = null;
let updateCheckDone = false;

export async function checkUpdateOnce(): Promise<UpdateCheckResponse | null> {
  if (updateCheckDone) return updateCheckResult;
  updateCheckDone = true;
  try {
    updateCheckResult = await checkForUpdate();
    return updateCheckResult;
  } catch {
    return null;
  }
}

export async function notifyIfUpdateAvailable(): Promise<void> {
  const result = await checkUpdateOnce();
  if (!result?.update_available) return;
  const version = result.latest_version ?? "newer version";
  await showToast({
    style: Toast.Style.Success,
    title: `oMLX update available — v${version}`,
    message: `Channel: ${result.update_channel}`,
    primaryAction: result.release_url
      ? {
          title: "View Release",
          onAction: () => open(result.release_url!),
        }
      : undefined,
  });
}

export async function checkForUpdate(): Promise<UpdateCheckResponse> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/update-check`, {
    method: "GET",
  });
  if (!response.ok) {
    throw new Error("Failed to check for updates");
  }
  return response.json() as Promise<UpdateCheckResponse>;
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
