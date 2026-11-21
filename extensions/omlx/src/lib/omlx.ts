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

// Non-chat model types oMLX reports through /v1/models/status. oMLX's audio
// detection covers known audio families, but rare tokenizer types (e.g.
// "s3_tokenizer_v2") fall through to "llm" — these signals catch them.
const EMBEDDING_MODEL_TYPES = new Set([
  "bert",
  "xlm-roberta",
  "xlm_roberta",
  "modernbert",
  "siglip",
  "colqwen2_5",
  "colqwen2-5",
]);

/**
 * Classify a non-chat model from its config type and id.
 * Returns "tokenizer", "embedding", "reranker", or null for chat models.
 */
export function nonChatModelKind(
  configModelType: string,
  id?: string,
): "tokenizer" | "embedding" | "reranker" | null {
  const type = (configModelType ?? "").toLowerCase();
  const name = (id ?? "").toLowerCase();
  if (type.includes("tokenizer")) return "tokenizer";
  if (type.includes("reranker") || type.includes("ranking")) return "reranker";
  if (name.includes("reranker") || name.includes("reranking"))
    return "reranker";
  if (EMBEDDING_MODEL_TYPES.has(type)) return "embedding";
  if (name.includes("embedding")) return "embedding";
  return null;
}

/** True when the config declares a non-chat architecture (tokenizer, embedding, reranker). */
export function isNonChatModelType(
  configModelType: string,
  id?: string,
): boolean {
  return nonChatModelKind(configModelType, id) != null;
}

// Models downloaded by a plain huggingface_hub/modelscope client live in the
// shared Hub cache, not oMLX's model directory. oMLX discovers and lists
// them, but its delete API only searches its own model directory — deletion
// from the extension cannot succeed for these.
export function isCacheSourcedModel(modelPath: string): boolean {
  const cacheMarkers = ["/.cache/huggingface/hub/", "/.cache/modelscope/hub/"];
  return cacheMarkers.some((marker) => (modelPath ?? "").includes(marker));
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

async function getAdminSession(signal?: AbortSignal): Promise<string> {
  if (adminSessionCookie) return adminSessionCookie;

  const response = await fetch(`${getBaseUrl()}/admin/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: getApiKey() }),
    signal,
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

async function adminHeaders(
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const session = await getAdminSession(signal);
  return {
    "Content-Type": "application/json",
    Cookie: `omlx_admin_session=${session}`,
  };
}

async function adminFetch(url: string, init: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: await adminHeaders(init.signal ?? undefined),
  });
  if (response.status === 401) {
    adminSessionCookie = null;
    return fetch(url, {
      ...init,
      headers: await adminHeaders(init.signal ?? undefined),
    });
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

export interface MemoryPressure {
  current_bytes: number;
  soft_bytes: number;
  hard_bytes: number;
  current_formatted: string;
  soft_formatted: string;
  hard_formatted: string;
  pressure_level: string;
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
  active_models?: {
    memory_pressure?: MemoryPressure;
  };
  runtime_cache?: {
    total_size_bytes: number;
    disk_max_bytes: number;
    total_num_files: number;
  };
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

/**
 * Validate a tasks endpoint response. A 200 with an unexpected shape
 * (missing/null/non-array tasks, malformed task entries) must become a
 * per-source error inside the backend promise, not a throw that discards
 * the other backend's healthy tasks.
 */
function parseTasksResponse(data: unknown, sourceLabel: string): HfTask[] {
  const tasks = (data as { tasks?: unknown } | null)?.tasks;
  if (
    !Array.isArray(tasks) ||
    tasks.some((task) => {
      if (typeof task !== "object" || task === null || Array.isArray(task)) {
        return true;
      }
      const entry = task as Record<string, unknown>;
      // Check fields consumed by rendering and actions, not unused metadata.
      // Error and completion time may be absent/null before a task finishes.
      return (
        typeof entry.task_id !== "string" ||
        typeof entry.repo_id !== "string" ||
        ![
          "pending",
          "downloading",
          "completed",
          "failed",
          "cancelled",
        ].includes(entry.status as string) ||
        ![entry.progress, entry.total_size, entry.downloaded_size].every(
          (value) => typeof value === "number" && Number.isFinite(value),
        ) ||
        (entry.error != null && typeof entry.error !== "string") ||
        (entry.completed_at != null &&
          (typeof entry.completed_at !== "number" ||
            !Number.isFinite(entry.completed_at)))
      );
    })
  ) {
    throw new Error(`Invalid ${sourceLabel} tasks response`);
  }
  return tasks as HfTask[];
}

// One deadline per backend covers login, a possible 401 retry, and body
// consumption. allSettled must not leave a healthy source waiting forever.
const DOWNLOAD_TASK_TIMEOUT_MS = 10_000;

export async function fetchHfTasks(): Promise<HfTask[]> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/hf/tasks`, {
    method: "GET",
    signal: AbortSignal.timeout(DOWNLOAD_TASK_TIMEOUT_MS),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch tasks: ${text.slice(0, 200)}`);
  }
  return parseTasksResponse(await response.json(), "HuggingFace");
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

export async function fetchMsTasks(): Promise<HfTask[]> {
  const response = await adminFetch(`${getBaseUrl()}/admin/api/ms/tasks`, {
    method: "GET",
    signal: AbortSignal.timeout(DOWNLOAD_TASK_TIMEOUT_MS),
  });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 503) {
      try {
        // Only this documented optional-backend response means no tasks.
        if (
          JSON.parse(text).detail === "ModelScope downloader not initialized"
        ) {
          return [];
        }
      } catch {
        // Other server responses must remain visible as failures.
      }
    }
    throw new Error(`Failed to fetch ModelScope tasks: ${text.slice(0, 200)}`);
  }
  return parseTasksResponse(await response.json(), "ModelScope");
}

export async function cancelMsDownload(taskId: string): Promise<void> {
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/ms/cancel/${encodeURIComponent(taskId)}`,
    { method: "POST" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cancel failed: ${text.slice(0, 200)}`);
  }
}

export async function retryMsDownload(taskId: string): Promise<void> {
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/ms/retry/${encodeURIComponent(taskId)}`,
    { method: "POST" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Retry failed: ${text.slice(0, 200)}`);
  }
}

export async function removeMsTask(taskId: string): Promise<void> {
  const response = await adminFetch(
    `${getBaseUrl()}/admin/api/ms/task/${encodeURIComponent(taskId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Remove failed: ${text.slice(0, 200)}`);
  }
}

export type DownloadSource = "huggingface" | "modelscope";

/** A download task tagged with the backend (HuggingFace or ModelScope) it runs on. */
export interface TrackedDownload extends HfTask {
  source: DownloadSource;
}

/**
 * Combined result from both download backends. When only one backend
 * fails, its error is reported per-source while the other backend's
 * tasks stay visible; a complete failure of both backends throws.
 */
export interface DownloadsResult {
  tasks: TrackedDownload[];
  /** Per-source fetch errors, present only for a failed backend. */
  errors: Partial<Record<DownloadSource, string>>;
}

function settlementError(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * Downloads from both sources. oMLX runs separate downloaders per source
 * with separate task IDs, so actions must be routed by `source`. The
 * ModelScope backend is optional (503 when not initialized); if it is
 * unavailable, HuggingFace downloads are still returned instead of
 * failing the whole view. A single-backend failure returns the other
 * backend's tasks with a per-source error; both failing throws.
 */
export async function fetchDownloads(): Promise<DownloadsResult> {
  const [hf, ms] = await Promise.allSettled([fetchHfTasks(), fetchMsTasks()]);
  const tasks: TrackedDownload[] = [];
  const errors: Partial<Record<DownloadSource, string>> = {};
  if (hf.status === "fulfilled") {
    tasks.push(
      ...hf.value.map((t) => ({ ...t, source: "huggingface" as const })),
    );
  } else {
    errors.huggingface = settlementError(hf.reason);
  }
  if (ms.status === "fulfilled") {
    tasks.push(
      ...ms.value.map((t) => ({ ...t, source: "modelscope" as const })),
    );
  } else {
    errors.modelscope = settlementError(ms.reason);
  }
  if (hf.status === "rejected" && ms.status === "rejected") {
    throw new Error(
      [errors.huggingface, errors.modelscope].filter(Boolean).join("; "),
    );
  }
  return { tasks, errors };
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

let updateCheckPromise: Promise<UpdateCheckResponse | null> | null = null;
// Passive update toasts are shown at most once per command runtime;
// otherwise the 1s download polling would resurface it constantly.
let updateToastShown = false;

export async function checkUpdateOnce(): Promise<UpdateCheckResponse | null> {
  // Share an in-flight check as well as its result with every caller.
  updateCheckPromise ??= checkForUpdate().catch(() => null);
  return updateCheckPromise;
}

export async function notifyIfUpdateAvailable(): Promise<void> {
  if (updateToastShown) return;
  const result = await checkUpdateOnce();
  if (!result?.update_available || updateToastShown) return;
  updateToastShown = true;
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
