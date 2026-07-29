import { getPreferenceValues } from "@raycast/api";

export interface QuotaWindow {
  label: string;
  percent: number;
  resetAt?: number;
}

export interface AccountQuota {
  weeklyPercent?: number;
  fiveHourPercent?: number;
  monthlyPercent?: number;
  weeklyResetAt?: number;
  fiveHourResetAt?: number;
  monthlyResetAt?: number;
  customWindows?: QuotaWindow[];
  resetCredits?: number;
  updatedAt: number;
}

export interface ProviderQuotaReport {
  provider: string;
  label?: string;
  source?: string;
  quota?: AccountQuota | null;
  updatedAt?: number;
  error?: string;
}

export interface ProviderQuotasResponse {
  generatedAt: number;
  reports: ProviderQuotaReport[];
}

export interface ProviderInfo {
  name: string;
  adapter: string;
  baseUrl: string;
  defaultModel?: string;
  hasApiKey?: boolean;
  disabled?: boolean;
  codexAccountMode?: string;
}

export interface ConfigResponse {
  port: number;
  hostname: string;
  defaultProvider?: string;
  providers?: Record<string, { authMode?: string; description?: string }>;
}

export interface UsageProvider {
  provider: string;
  requests: number;
  totalTokens: number;
  shareRatio?: number;
  estimatedCostUsd?: number;
  measuredRequests?: number;
  reportedRequests?: number;
  estimatedRequests?: number;
}

export interface UsageModel {
  provider: string;
  model: string;
  resolvedModel?: string;
  requests: number;
  measuredRequests?: number;
  reportedRequests?: number;
  estimatedRequests?: number;
  totalTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  shareRatio?: number;
}

export interface UsageDayModel {
  provider: string;
  model: string;
  requests: number;
  totalTokens: number;
}

export interface UsageDay {
  date: string;
  requests: number;
  measuredRequests?: number;
  reportedRequests?: number;
  totalTokens: number;
  models?: UsageDayModel[];
}

export interface UsageSummary {
  requests?: number;
  attemptCount?: number;
  measuredRequests?: number;
  reportedRequests?: number;
  unreportedRequests?: number;
  unsupportedRequests?: number;
  estimatedRequests?: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  reasoningOutputTokens?: number;
  totalTokens?: number;
  coverageRatio?: number;
  estimatedCostUsd?: number;
  pricedRequests?: number;
  unpricedRequests?: number;
  unmeteredRequests?: number;
}

export interface UsageResponse {
  range: string;
  surface?: string;
  since?: number | null;
  generatedAt?: number;
  summary?: UsageSummary;
  days?: UsageDay[];
  models?: UsageModel[];
  providers?: UsageProvider[];
  error?: string;
}

/** Which rate-limit window a ring/pill reports. */
export type WindowChoice = "weekly" | "5h" | "monthly" | "worst";

/** Which window the pace hint tracks, or `off` to hide it entirely. */
export type PaceWindowChoice = "weekly" | "5h" | "monthly" | "off";

interface Preferences {
  baseUrl: string;
  usageRange: string;
  ringWindow: WindowChoice;
  paceWindow: PaceWindowChoice;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:10100";

/** Tolerates `localhost:10100` and stray trailing slashes so the preference is forgiving. */
function normaliseBaseUrl(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
}

export function getPreferences(): Preferences {
  const prefs = getPreferenceValues<Preferences>();
  return {
    baseUrl: normaliseBaseUrl(prefs.baseUrl),
    usageRange: prefs.usageRange || "30d",
    ringWindow: prefs.ringWindow || "weekly",
    paceWindow: prefs.paceWindow || "weekly",
  };
}

export interface MenuBarPreferences extends Preferences {
  /** Provider id the pill is pinned to, or `all` to consider every provider. */
  menuBarProvider: string;
  menuBarWindow: WindowChoice;
  menuBarShowProvider: "percent" | "provider" | "none";
}

export function getMenuBarPreferences(): MenuBarPreferences {
  const shared = getPreferences();
  const prefs = getPreferenceValues<{
    menuBarProvider?: string;
    menuBarWindow?: WindowChoice | "inherit";
    menuBarShowProvider?: "percent" | "provider" | "none";
  }>();
  const window = prefs.menuBarWindow && prefs.menuBarWindow !== "inherit" ? prefs.menuBarWindow : shared.ringWindow;
  return {
    ...shared,
    menuBarProvider: (prefs.menuBarProvider ?? "all").trim().toLowerCase() || "all",
    menuBarWindow: window,
    menuBarShowProvider: prefs.menuBarShowProvider || "percent",
  };
}

/** The proxy is local, so anything slower than this is a hang rather than a slow network. */
const REQUEST_TIMEOUT_MS = 10_000;

async function getJson<T>(baseUrl: string, path: string, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  // Callers may cancel on unmount; the timeout guards against a proxy that accepts the
  // connection but never answers.
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      signal: combined,
      headers: { Accept: "application/json" },
    });
  } catch (cause) {
    if (timeout.aborted) {
      throw new Error(`${baseUrl} did not respond within ${REQUEST_TIMEOUT_MS / 1000}s.`);
    }
    throw cause;
  }

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}.`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new Error(`Unexpected response from ${path}. Is ${baseUrl} an OpenCodex server?`);
  }
  return (await response.json()) as T;
}

export interface Snapshot {
  quotas: ProviderQuotasResponse;
  providers: ProviderInfo[];
  config?: ConfigResponse;
  usage?: UsageResponse;
}

export async function fetchSnapshot(options?: { refresh?: boolean; signal?: AbortSignal }): Promise<Snapshot> {
  const { baseUrl, usageRange } = getPreferences();
  const signal = options?.signal;
  const quotaPath = `/api/provider-quotas${options?.refresh ? "?refresh=1" : ""}`;

  const [quotas, providers, config, usage] = await Promise.all([
    getJson<ProviderQuotasResponse>(baseUrl, quotaPath, signal),
    getJson<ProviderInfo[]>(baseUrl, "/api/providers", signal).catch(() => [] as ProviderInfo[]),
    getJson<ConfigResponse>(baseUrl, "/api/config", signal).catch(() => undefined),
    getJson<UsageResponse>(baseUrl, `/api/usage?range=${encodeURIComponent(usageRange)}`, signal).catch(
      () => undefined,
    ),
  ]);

  return { quotas, providers, config, usage };
}

export type UsageRange = "7d" | "30d" | "all";
export type UsageSurface = "all" | "codex" | "claude" | "grok";

export async function fetchUsage(
  range: UsageRange,
  surface: UsageSurface,
  signal?: AbortSignal,
): Promise<UsageResponse> {
  const { baseUrl } = getPreferences();
  return getJson<UsageResponse>(
    baseUrl,
    `/api/usage?range=${encodeURIComponent(range)}&surface=${encodeURIComponent(surface)}`,
    signal,
  );
}
