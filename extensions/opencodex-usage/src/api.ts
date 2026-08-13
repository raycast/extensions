import { readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { getPreferenceValues } from "@raycast/api";
import { isConfigResponse, isProviderInfoList, isProviderQuotasResponse, isUsageResponse, type Guard } from "./guards";

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

const DEFAULT_BASE_URL = "http://127.0.0.1:10100";

/** Tolerates `localhost:10100` and stray trailing slashes so the preference is forgiving. */
function normaliseBaseUrl(value?: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_BASE_URL;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
}

/**
 * Newer OpenCodex builds gate every `/api/*` route behind an admin token. The server keeps it in
 * `$OPENCODEX_HOME/admin-api-token` (default `~/.opencodex`), so read it from there instead of
 * making everyone paste a secret into preferences.
 */
const ADMIN_TOKEN_FILE = "admin-api-token";

function expandUserPath(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith("~/")) return join(homedir(), value.slice(2));
  return value;
}

function openCodexConfigDir(): string {
  const raw = process.env.OPENCODEX_HOME?.trim();
  return raw ? resolve(expandUserPath(raw)) : join(homedir(), ".opencodex");
}

/** The token file is local, tiny and mode 0600; anything else is not the secret we expect. */
function readAdminTokenFile(): string | undefined {
  try {
    const path = join(openCodexConfigDir(), ADMIN_TOKEN_FILE);
    const stat = statSync(path);
    if (!stat.isFile() || stat.size > 512) return undefined;
    return readFileSync(path, "utf8").trim() || undefined;
  } catch {
    // Missing file simply means an older server that does not require the token.
    return undefined;
  }
}

/**
 * Hosts the machine's own OpenCodex secret may be sent to. A token discovered from the
 * environment or disk was never meant for a third party, so it is withheld from anything but
 * loopback; pointing the extension at a remote proxy requires pasting a token deliberately.
 */
function isLoopbackUrl(baseUrl: string): boolean {
  try {
    const { hostname } = new URL(baseUrl);
    const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
    // IPv4-mapped loopback reaches the same local server. `URL` normalises `::ffff:127.0.0.1`
    // to its hex form (`::ffff:7f00:1`), so both spellings are unwrapped here.
    const mapped = host.startsWith("::ffff:") ? host.slice(7) : undefined;
    if (mapped && /^7f[0-9a-f]{2}:[0-9a-f]{1,4}$/.test(mapped)) return true;
    const bare = mapped ?? host;
    return (
      bare === "localhost" ||
      bare === "::1" ||
      bare === "0.0.0.0" ||
      bare.endsWith(".localhost") ||
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(bare)
    );
  } catch {
    return false;
  }
}

/** Preference wins, then the env var the server itself honours, then the on-disk token. */
function resolveAdminToken(preference: string | undefined, baseUrl: string): string | undefined {
  const explicit = preference?.trim();
  if (explicit) return explicit;
  if (!isLoopbackUrl(baseUrl)) return undefined;
  return process.env.OPENCODEX_ADMIN_AUTH_TOKEN?.trim() || readAdminTokenFile();
}

export function getPreferences(): Preferences {
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = normaliseBaseUrl(prefs.baseUrl);
  return {
    baseUrl,
    adminToken: resolveAdminToken(prefs.adminToken, baseUrl) ?? "",
    usageRange: prefs.usageRange || "30d",
    ringWindow: prefs.ringWindow || "weekly",
    paceWindow: prefs.paceWindow || "weekly",
  };
}

export interface MenuBarPreferences extends Omit<Preferences.UsageMenuBar, "menuBarWindow"> {
  /** Resolved window: `inherit` has already been folded into the shared ring window. */
  menuBarWindow: WindowChoice;
}

export function getMenuBarPreferences(): MenuBarPreferences {
  const shared = getPreferences();
  const prefs = getPreferenceValues<Preferences.UsageMenuBar>();
  const window = prefs.menuBarWindow && prefs.menuBarWindow !== "inherit" ? prefs.menuBarWindow : shared.ringWindow;
  return {
    ...shared,
    menuBarProvider: ((prefs.menuBarProvider ?? "all").trim().toLowerCase() ||
      "all") as Preferences.UsageMenuBar["menuBarProvider"],
    menuBarWindow: window,
    menuBarShowProvider: prefs.menuBarShowProvider || "percent",
  };
}

/** Remote proxies may be a hop away; loopback either answers immediately or isn't running. */
const REMOTE_REQUEST_TIMEOUT_MS = 10_000;
const LOOPBACK_REQUEST_TIMEOUT_MS = 2_000;

function requestTimeoutMs(baseUrl: string): number {
  return isLoopbackUrl(baseUrl) ? LOOPBACK_REQUEST_TIMEOUT_MS : REMOTE_REQUEST_TIMEOUT_MS;
}

/** Node's fetch wraps TCP failures as `TypeError: fetch failed` with the errno on `cause`. */
function connectionErrorCode(cause: unknown): string | undefined {
  if (
    !(cause instanceof Error) ||
    cause.cause === undefined ||
    typeof cause.cause !== "object" ||
    cause.cause === null
  ) {
    return undefined;
  }
  if (!("code" in cause.cause)) return undefined;
  const code = cause.cause.code;
  return typeof code === "string" ? code : undefined;
}

function isUnreachableProxy(code: string | undefined): boolean {
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH" ||
    code === "ECONNRESET"
  );
}

/** The proxy answered, but refused the management call because the admin token is missing/wrong. */
export class AdminTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminTokenError";
  }
}

interface Endpoint {
  baseUrl: string;
  adminToken?: string;
}

async function getJson<T>(endpoint: Endpoint, path: string, isValid: Guard<T>, signal?: AbortSignal): Promise<T> {
  const { baseUrl, adminToken } = endpoint;
  const timeoutMs = requestTimeoutMs(baseUrl);
  const timeout = AbortSignal.timeout(timeoutMs);
  // Callers may cancel on unmount; the timeout guards against a proxy that accepts the
  // connection but never answers.
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      signal: combined,
      headers: {
        Accept: "application/json",
        // Newer servers reject unauthenticated management calls with 401; older ones ignore it.
        ...(adminToken ? { "x-opencodex-api-key": adminToken } : {}),
      },
    });
  } catch (cause) {
    if (timeout.aborted) {
      throw new Error(
        `${baseUrl} did not respond within ${timeoutMs / 1000}s. Make sure the OpenCodex proxy is running.`,
      );
    }
    if (isUnreachableProxy(connectionErrorCode(cause))) {
      throw new Error(`Cannot connect to ${baseUrl}. Make sure the OpenCodex proxy is running.`);
    }
    throw cause;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      // Without a token the advice depends on where the proxy runs: the local token file only
      // applies to this machine's own server, so a remote host is told to paste its own token.
      const missingTokenHint = isLoopbackUrl(baseUrl)
        ? `Copy it from ${join(openCodexConfigDir(), ADMIN_TOKEN_FILE)} into the extension preferences.`
        : "Paste the token for that server into the extension preferences.";
      throw new AdminTokenError(
        adminToken
          ? `${baseUrl} rejected the OpenCodex admin token. Check the token in the extension preferences.`
          : `${baseUrl} requires an OpenCodex admin token. ${missingTokenHint}`,
      );
    }
    throw new Error(`Request to ${path} failed with status ${response.status}.`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new Error(`Unexpected response from ${path}. Is ${baseUrl} an OpenCodex server?`);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Malformed JSON from ${path}. Is ${baseUrl} an OpenCodex server?`);
  }
  if (!isValid(payload)) {
    throw new Error(`Unexpected payload from ${path}. Is ${baseUrl} an OpenCodex server?`);
  }
  return payload;
}

export interface Snapshot {
  quotas: ProviderQuotasResponse;
  providers: ProviderInfo[];
  config?: ConfigResponse;
  usage?: UsageResponse;
}

export async function fetchSnapshot(options?: { refresh?: boolean; signal?: AbortSignal }): Promise<Snapshot> {
  const { baseUrl, adminToken, usageRange } = getPreferences();
  const endpoint: Endpoint = { baseUrl, adminToken };
  const signal = options?.signal;
  const quotaPath = `/api/provider-quotas${options?.refresh ? "?refresh=1" : ""}`;

  const [quotas, providers, config, usage] = await Promise.all([
    getJson(endpoint, quotaPath, isProviderQuotasResponse, signal),
    getJson(endpoint, "/api/providers", isProviderInfoList, signal).catch(() => [] as ProviderInfo[]),
    getJson(endpoint, "/api/config", isConfigResponse, signal).catch(() => undefined),
    // Usage only enriches the quota rows here, so a failure or a server-reported error simply
    // drops the extra request/token totals rather than failing the whole snapshot.
    getJson(endpoint, `/api/usage?range=${encodeURIComponent(usageRange)}`, isUsageResponse, signal)
      .then((usage) => (usage.error ? undefined : usage))
      .catch(() => undefined),
  ]);

  return { quotas, providers, config, usage };
}

export type UsageRange = "7d" | "30d" | "all";
export type UsageSurface = "all" | "codex" | "claude" | "grok";

/** The proxy was reachable and answered, but reported that it could not serve the query. */
export class UsageQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageQueryError";
  }
}

export async function fetchUsage(
  range: UsageRange,
  surface: UsageSurface,
  signal?: AbortSignal,
): Promise<UsageResponse> {
  const { baseUrl, adminToken } = getPreferences();
  const usage = await getJson(
    { baseUrl, adminToken },
    `/api/usage?range=${encodeURIComponent(range)}&surface=${encodeURIComponent(surface)}`,
    isUsageResponse,
    signal,
  );
  // The proxy reports query failures as a 200 with an `error` field, so surface it as a real
  // failure instead of letting the view render an empty "No usage data" state.
  if (usage.error) throw new UsageQueryError(usage.error);
  return usage;
}
