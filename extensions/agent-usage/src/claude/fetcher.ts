import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { ClaudeUsage, ClaudeError, ClaudeAccountIdentity } from "./types.ts";

const CLAUDE_CONFIG_DIR_ENV = "CLAUDE_CONFIG_DIR";
const DEFAULT_CLAUDE_CONFIG_DIR = path.join(os.homedir(), ".claude");
const CLAUDE_CREDENTIALS_FILE = ".credentials.json";
const CLAUDE_CONFIG_FILE = ".claude.json";
const CLAUDE_USAGE_API = "https://api.anthropic.com/api/oauth/usage";
const KEYCHAIN_SERVICE = "Claude Code-credentials";
const REQUEST_TIMEOUT = 10000;

// OAuth beta header required by Anthropic API (as of 2025-04-20)
const CLAUDE_OAUTH_BETA_HEADER = "oauth-2025-04-20";

type CredentialSource = "file" | "keychain";

export interface ClaudeCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scopes: string[];
  rateLimitTier?: string;
  subscriptionType?: string;
  source: CredentialSource;
  credentialsPath?: string;
  keychainAccount?: string;
  /** The Keychain service this came from, so a refresh writes back to the same item. */
  keychainService?: string;
  raw: {
    claudeAiOauth?: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      scopes?: string[];
      rateLimitTier?: string;
      rate_limit_tier?: string;
      subscriptionType?: string;
      subscription_type?: string;
    };
  };
}

interface OAuthWindow {
  utilization?: number;
  resets_at?: string;
}

interface OAuthExtraUsage {
  is_enabled?: boolean;
  monthly_limit?: number;
  used_credits?: number;
  currency?: string;
}

interface OAuthLimitScope {
  model?: { id?: string | null; display_name?: string | null };
  surface?: string | null;
}

interface OAuthLimit {
  kind?: string;
  group?: string;
  percent?: number;
  severity?: string;
  resets_at?: string;
  scope?: OAuthLimitScope | null;
  is_active?: boolean;
}

interface OAuthUsageResponse {
  five_hour?: OAuthWindow;
  seven_day?: OAuthWindow;
  extra_usage?: OAuthExtraUsage;
  limits?: OAuthLimit[];
  [key: string]: OAuthWindow | OAuthExtraUsage | OAuthLimit[] | undefined;
}

interface OAuthRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

const CLAUDE_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const CLAUDE_OAUTH_REFRESH_API = "https://platform.claude.com/v1/oauth/token";

function normalizeAccessToken(token: string): string {
  const trimmed = token.trim();
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed.slice(7).trim() : trimmed;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

export function resolveClaudeCredentialsPaths(env: NodeJS.ProcessEnv = process.env): string[] {
  const configuredDir = env[CLAUDE_CONFIG_DIR_ENV]?.trim();
  const configDirs = configuredDir ? [configuredDir, DEFAULT_CLAUDE_CONFIG_DIR] : [DEFAULT_CLAUDE_CONFIG_DIR];

  return [...new Set(configDirs.map((configDir) => path.resolve(configDir, CLAUDE_CREDENTIALS_FILE)))];
}

function inferPlan(rateLimitTier?: string, subscriptionType?: string): string {
  const tier = (rateLimitTier || "").toLowerCase();
  const subscription = (subscriptionType || "").toLowerCase();

  if (subscription.includes("max")) return "Claude Max";
  if (subscription.includes("pro")) return "Claude Pro";
  if (subscription.includes("team")) return "Claude Team";
  if (subscription.includes("enterprise")) return "Claude Enterprise";

  if (tier.includes("max")) return "Claude Max";
  if (tier.includes("pro")) return "Claude Pro";
  if (tier.includes("team")) return "Claude Team";
  if (tier.includes("enterprise")) return "Claude Enterprise";
  return "Claude";
}

function formatResetsIn(isoTime?: string): string | null {
  if (!isoTime) return null;

  const resetDate = new Date(isoTime);
  if (Number.isNaN(resetDate.getTime())) return null;

  const diffMs = resetDate.getTime() - Date.now();
  if (diffMs <= 0) return "now";

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

interface CredentialsParsed {
  claudeAiOauth?: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    scopes?: string[];
    rateLimitTier?: string;
    rate_limit_tier?: string;
    subscriptionType?: string;
    subscription_type?: string;
  };
}

function tryDecodeHexJson(text: string): CredentialsParsed | null {
  let hex = text.trim();
  if (hex.startsWith("0x") || hex.startsWith("0X")) hex = hex.slice(2);
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return JSON.parse(decoded) as CredentialsParsed;
  } catch {
    return null;
  }
}

function tryParseCredentialJSON(text: string): CredentialsParsed | null {
  try {
    return JSON.parse(text) as CredentialsParsed;
  } catch {
    return tryDecodeHexJson(text);
  }
}

function readKeychainPassword(service: string): string | null {
  try {
    const result = execSync(`security find-generic-password -s ${JSON.stringify(service)} -w`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

function readKeychainAccount(service: string): string | null {
  try {
    const result = execSync(`security find-generic-password -s ${JSON.stringify(service)} -g 2>&1`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const match = result.match(/"acct"<blob>="([^"\n]*)"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function writeKeychainPassword(service: string, account: string, value: string): void {
  try {
    execSync(
      `security add-generic-password -U -a ${JSON.stringify(account)} -s ${JSON.stringify(service)} -w ${JSON.stringify(value)}`,
      {
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch {
    // Best effort
  }
}

/** An account discovered on disk (or in the Keychain), ready for the accounts hook. */
export interface ClaudeOAuthAccount {
  id: string;
  label: string;
  token: string;
  /** Symlinks resolved, so two spellings of one home collapse to a single account. */
  configDir: string;
  credentials: ClaudeCredentials;
  scopeError: ClaudeError | null;
  identity: ClaudeAccountIdentity | null;
}

function buildClaudeCredentials(
  parsed: CredentialsParsed,
  source: CredentialSource,
  credentialsPath?: string,
  keychainAccount?: string,
  keychainService?: string,
): ClaudeCredentials | null {
  const oauth = parsed.claudeAiOauth;
  const accessToken = normalizeAccessToken(oauth?.accessToken || "");
  if (!accessToken) return null;

  const refreshToken = oauth?.refreshToken?.trim() || "";

  return {
    accessToken,
    refreshToken: refreshToken || undefined,
    expiresAt: typeof oauth?.expiresAt === "number" ? oauth.expiresAt : undefined,
    scopes: Array.isArray(oauth?.scopes) ? oauth.scopes : [],
    rateLimitTier: pickString(oauth?.rateLimitTier, oauth?.rate_limit_tier),
    subscriptionType: pickString(oauth?.subscriptionType, oauth?.subscription_type),
    source,
    credentialsPath,
    keychainAccount,
    keychainService,
    raw: parsed,
  };
}

/**
 * A token without `user:profile` still identifies a real account, so the scope
 * check is reported against that account's row instead of hiding it.
 */
export function validateClaudeScopes(credentials: ClaudeCredentials): ClaudeError | null {
  if (credentials.scopes.includes("user:profile")) return null;

  return {
    type: "missing_scope",
    message: "Claude OAuth token missing 'user:profile' scope. Run 'claude setup-token'.",
  };
}

/**
 * Who this config dir is signed in as.
 *
 * Credentials carry the plan but not the identity, so the account name comes
 * from Claude Code's own `.claude.json`. It is a large file, but only
 * `oauthAccount` is read and the accounts hook caches the result.
 */
export function readClaudeAccountIdentity(configDir: string): ClaudeAccountIdentity | null {
  try {
    const configPath = path.resolve(configDir, CLAUDE_CONFIG_FILE);
    if (!fs.existsSync(configPath)) return null;

    const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8")) as {
      oauthAccount?: { emailAddress?: string; displayName?: string; organizationName?: string };
    };
    const account = parsed.oauthAccount;
    if (!account) return null;

    const identity = {
      email: pickString(account.emailAddress) ?? null,
      displayName: pickString(account.displayName) ?? null,
      organizationName: pickString(account.organizationName) ?? null,
    };

    return identity.email || identity.displayName || identity.organizationName ? identity : null;
  } catch {
    return null;
  }
}

/**
 * Directory names carry the user's own meaning (`~/.claude-work` → "work"), so
 * they win. The stock `~/.claude` names nothing, so it falls back to the signed-in
 * account rather than rendering as a bare, unattributable "Claude" row.
 */
export function deriveClaudeAccountLabel(configDir: string, identity?: ClaudeAccountIdentity | null): string {
  const base = path.basename(path.resolve(configDir)).replace(/^\./, "");

  if (!base || base.toLowerCase() === "claude") {
    const fromAccount = identity?.displayName ?? identity?.email?.split("@")[0];
    return fromAccount || "Default";
  }

  const suffix = base.replace(/^claude[-_.]?/i, "");
  return suffix || base;
}

function expandHome(target: string, homeDir: string): string {
  if (target === "~") return path.resolve(homeDir);
  if (target.startsWith("~/")) return path.resolve(path.join(homeDir, target.slice(2)));
  return path.resolve(target);
}

/**
 * The Keychain service holding a config dir's credentials.
 *
 * Claude Code keys non-default homes by the first 8 hex characters of the
 * SHA-256 of the absolute config dir, and uses the bare service name for the
 * stock `~/.claude`. The scheme is undocumented, so a miss degrades to the
 * credentials file rather than failing.
 */
export function claudeKeychainService(configDir: string, homeDir: string = os.homedir()): string {
  const resolved = expandHome(configDir, homeDir);
  if (resolved === path.resolve(homeDir, ".claude")) return KEYCHAIN_SERVICE;

  return `${KEYCHAIN_SERVICE}-${createHash("sha256").update(resolved).digest("hex").slice(0, 8)}`;
}

export type KeychainReader = (service: string) => { password: string | null; account: string | null };

const defaultReadKeychain: KeychainReader = (service) => {
  if (process.platform !== "darwin") return { password: null, account: null };

  const password = readKeychainPassword(service);
  return { password, account: password ? readKeychainAccount(service) : null };
};

function readAccountFromKeychainService(
  configDir: string,
  readKeychain: KeychainReader,
  homeDir: string,
): ClaudeOAuthAccount | null {
  const service = claudeKeychainService(configDir, homeDir);
  const { password, account } = readKeychain(service);
  if (!password) return null;

  const parsed = tryParseCredentialJSON(password);
  if (!parsed?.claudeAiOauth?.accessToken) return null;

  const credentials = buildClaudeCredentials(parsed, "keychain", undefined, account ?? undefined, service);
  if (!credentials) return null;

  const identity = readClaudeAccountIdentity(configDir);

  return {
    id: `keychain:${service}`,
    label: deriveClaudeAccountLabel(configDir, identity),
    token: credentials.accessToken,
    configDir: resolveConfigDirIdentity(configDir),
    credentials,
    scopeError: validateClaudeScopes(credentials),
    identity,
  };
}

function readAccountFromFile(configDir: string): ClaudeOAuthAccount | null {
  const credentialsPath = path.resolve(configDir, CLAUDE_CREDENTIALS_FILE);
  if (!fs.existsSync(credentialsPath)) return null;

  try {
    const parsed = tryParseCredentialJSON(fs.readFileSync(credentialsPath, "utf-8"));
    if (!parsed?.claudeAiOauth?.accessToken) return null;

    const credentials = buildClaudeCredentials(parsed, "file", credentialsPath);
    if (!credentials) return null;

    const identity = readClaudeAccountIdentity(configDir);

    return {
      id: credentialsPath,
      label: deriveClaudeAccountLabel(configDir, identity),
      token: credentials.accessToken,
      configDir: resolveConfigDirIdentity(configDir),
      credentials,
      scopeError: validateClaudeScopes(credentials),
      identity,
    };
  } catch {
    return null;
  }
}

/**
 * On macOS the Keychain is authoritative: Claude Code writes there, and a
 * `.credentials.json` left next to it can be days stale. Reading the file first
 * reports a dead token while a live one sits in the Keychain.
 */
function readAccountFromConfigDir(
  configDir: string,
  readKeychain: KeychainReader,
  homeDir: string,
): ClaudeOAuthAccount | null {
  return readAccountFromKeychainService(configDir, readKeychain, homeDir) ?? readAccountFromFile(configDir);
}

/**
 * The same login reached twice is one account, not two rows.
 *
 * Matching on the token alone is not enough: `~/.claude` symlinked to a profile
 * directory yields two Keychain items for one account, each with its own token,
 * so the resolved config dir has to count as the same identity.
 */
export function dedupeClaudeAccounts(accounts: ClaudeOAuthAccount[]): ClaudeOAuthAccount[] {
  const seenTokens = new Set<string>();
  const seenDirs = new Set<string>();

  return accounts.filter((account) => {
    if (seenTokens.has(account.token)) return false;
    if (account.configDir && seenDirs.has(account.configDir)) return false;

    seenTokens.add(account.token);
    if (account.configDir) seenDirs.add(account.configDir);
    return true;
  });
}

/** Symlinks resolved where possible; a missing directory falls back to the literal path. */
function resolveConfigDirIdentity(configDir: string): string {
  try {
    return fs.realpathSync(path.resolve(configDir));
  } catch {
    return path.resolve(configDir);
  }
}

/**
 * Discover Claude accounts. Config dirs are accumulated rather than
 * short-circuited at the first hit, so a personal and a work login can be shown
 * side by side.
 *
 * Each config dir is read from its own Keychain service first and from its
 * `.credentials.json` only as a fallback — Claude Code writes to the Keychain, so
 * the file next to it can be days stale. `claudeKeychainService` resolves that
 * service: the canonical name for `~/.claude`, a `sha256(<config dir>)` suffix for
 * every other profile.
 */
export function listClaudeOAuthAccounts(
  options: {
    configDir?: string;
    env?: NodeJS.ProcessEnv;
    homeDir?: string;
    readKeychain?: KeychainReader;
  } = {},
): ClaudeOAuthAccount[] {
  const { configDir, env = process.env, homeDir = os.homedir(), readKeychain = defaultReadKeychain } = options;

  if (configDir) {
    const account = readAccountFromConfigDir(configDir, readKeychain, homeDir);
    return account ? [account] : [];
  }

  const accounts = resolveClaudeCredentialsPaths(env)
    .map((credentialsPath) => readAccountFromConfigDir(path.dirname(credentialsPath), readKeychain, homeDir))
    .filter((account): account is ClaudeOAuthAccount => account !== null);

  return dedupeClaudeAccounts(accounts);
}

function persistRefreshedCredentials(credentials: ClaudeCredentials, refreshed: OAuthRefreshResponse) {
  const raw = credentials.raw || {};
  const oauth = raw.claudeAiOauth || {};

  const next = {
    ...raw,
    claudeAiOauth: {
      ...oauth,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || oauth.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
    },
  };

  if (credentials.source === "keychain") {
    if (credentials.keychainAccount === undefined) {
      return;
    }

    // Minified JSON — macOS `security -w` hex-encodes values with newlines,
    // which Claude Code can't read back, causing it to invalidate the session.
    writeKeychainPassword(
      credentials.keychainService ?? KEYCHAIN_SERVICE,
      credentials.keychainAccount,
      JSON.stringify(next),
    );
  } else {
    try {
      const credentialsPath = credentials.credentialsPath ?? resolveClaudeCredentialsPaths()[0];
      fs.writeFileSync(credentialsPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    } catch {
      // Best effort; continue with refreshed token in memory
    }
  }
}

async function refreshClaudeAccessToken(credentials: ClaudeCredentials): Promise<OAuthRefreshResponse | null> {
  if (!credentials.refreshToken) {
    return null;
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
    client_id: CLAUDE_OAUTH_CLIENT_ID,
  });

  const response = await fetch(CLAUDE_OAUTH_REFRESH_API, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as OAuthRefreshResponse;
  if (!data.access_token || typeof data.expires_in !== "number") {
    return null;
  }
  return data;
}

export async function fetchClaudeUsage(
  credentials: ClaudeCredentials,
  identity: ClaudeAccountIdentity | null = null,
): Promise<{ usage: ClaudeUsage | null; error: ClaudeError | null }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let accessToken = credentials.accessToken;
    const isLikelyExpired = typeof credentials.expiresAt === "number" && Date.now() >= credentials.expiresAt - 60000;
    if (isLikelyExpired) {
      const refreshed = await refreshClaudeAccessToken(credentials);
      if (refreshed) {
        accessToken = refreshed.access_token;
        persistRefreshedCredentials(credentials, refreshed);
      }
    }

    let response = await fetch(CLAUDE_USAGE_API, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "anthropic-beta": CLAUDE_OAUTH_BETA_HEADER,
      },
      signal: controller.signal,
    });

    if (response.status === 401 && credentials.refreshToken) {
      const refreshed = await refreshClaudeAccessToken(credentials);
      if (refreshed) {
        accessToken = refreshed.access_token;
        persistRefreshedCredentials(credentials, refreshed);
        response = await fetch(CLAUDE_USAGE_API, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "anthropic-beta": CLAUDE_OAUTH_BETA_HEADER,
          },
          signal: controller.signal,
        });
      }
    }

    clearTimeout(timeoutId);

    if (response.status === 401) {
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "Claude token expired or invalid. Run 'claude' to re-authenticate.",
        },
      };
    }

    if (response.status === 403) {
      const body = await response.text();
      if (body.includes("user:profile")) {
        return {
          usage: null,
          error: {
            type: "missing_scope",
            message: "Claude OAuth token does not include 'user:profile'. Run 'claude setup-token'.",
          },
        };
      }
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "Claude usage endpoint rejected the token. Run 'claude' to refresh login.",
        },
      };
    }

    if (!response.ok) {
      return {
        usage: null,
        error: {
          type: "unknown",
          message: `HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }

    const data = (await response.json()) as OAuthUsageResponse;
    const fiveHour = data.five_hour;

    if (!fiveHour || typeof fiveHour.utilization !== "number") {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: "Missing five_hour usage in Claude response.",
        },
      };
    }

    const sevenDay = data.seven_day;

    // Dynamically collect any seven_day_<model> windows (e.g. sonnet, opus, ...)
    const modelWindows: Record<string, import("./types.ts").ClaudeRateWindow> = {};
    const KNOWN_NON_MODEL_KEYS = new Set([
      "five_hour",
      "seven_day",
      "extra_usage",
      "limits",
      "spend",
      "member_dashboard_available",
    ]);
    for (const [key, value] of Object.entries(data)) {
      if (KNOWN_NON_MODEL_KEYS.has(key)) continue;
      if (!key.startsWith("seven_day_")) continue;
      const window = value as OAuthWindow | undefined;
      if (window && typeof window.utilization === "number") {
        const modelName = key.slice("seven_day_".length);
        modelWindows[modelName] = {
          percentageRemaining: clampPercent(100 - window.utilization),
          resetsIn: formatResetsIn(window.resets_at),
        };
      }
    }

    // Also parse the structured `limits` array for model-scoped weekly limits
    // (e.g. Fable). These take precedence over any seven_day_* flat key.
    if (Array.isArray(data.limits)) {
      for (const limit of data.limits) {
        if (limit.kind !== "weekly_scoped" || limit.is_active === false) continue;
        const modelName = limit.scope?.model?.display_name ?? limit.scope?.model?.id;
        if (!modelName || typeof limit.percent !== "number") continue;
        const key = modelName.toLowerCase();
        modelWindows[key] = {
          percentageRemaining: clampPercent(100 - limit.percent),
          resetsIn: formatResetsIn(limit.resets_at),
        };
      }
    }

    const extra = data.extra_usage as OAuthExtraUsage | undefined;
    const extraUsage =
      extra?.is_enabled && typeof extra.monthly_limit === "number" && typeof extra.used_credits === "number"
        ? {
            used: extra.used_credits / 100,
            limit: extra.monthly_limit / 100,
            currency: (extra.currency || "USD").toUpperCase(),
          }
        : null;

    const usage: ClaudeUsage = {
      plan: inferPlan(credentials.rateLimitTier, credentials.subscriptionType),
      fiveHour: {
        percentageRemaining: clampPercent(100 - fiveHour.utilization),
        resetsIn: formatResetsIn(fiveHour.resets_at),
      },
      sevenDay:
        sevenDay && typeof sevenDay.utilization === "number"
          ? {
              percentageRemaining: clampPercent(100 - sevenDay.utilization),
              resetsIn: formatResetsIn(sevenDay.resets_at),
            }
          : null,
      modelWindows,
      extraUsage,
      identity,
    };

    return { usage, error: null };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        usage: null,
        error: {
          type: "network_error",
          message: "Request timeout. Please check your network connection.",
        },
      };
    }

    return {
      usage: null,
      error: {
        type: "network_error",
        message: error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}
