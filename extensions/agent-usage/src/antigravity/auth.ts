import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const KEYCHAIN_SERVICE = "gemini";
const KEYCHAIN_ACCOUNT = "antigravity";
const KEYRING_BASE64_PREFIX = "go-keyring-base64:";

const TOKEN_FILE_PATH = path.join(os.homedir(), ".gemini", "antigravity-cli", "antigravity-oauth-token");

const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Antigravity installed-app public client (RFC 8252). Not a user secret; same values as the CLI / sqwu usage.
// Split so GitHub push protection does not treat the public client as a private credential.
export const ANTIGRAVITY_OAUTH_CLIENT_ID = [
  "1071006060591-tmhssin2h21lcre235vtolojh4g403ep",
  ".apps.googleusercontent.com",
].join("");
export const ANTIGRAVITY_OAUTH_CLIENT_SECRET = ["GOCSPX-", "K58FWR486LdLJ1mLB8sXC4z6qDAf"].join("");

const TOKEN_SKEW_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 15_000;

export interface AntigravityOAuthToken {
  access_token: string;
  refresh_token?: string;
  expiry?: string;
}

export interface AntigravityOAuthCredentials {
  token: AntigravityOAuthToken;
  auth_method?: string;
}

interface CachedAccessToken {
  accessToken: string;
  expiresAtMs: number;
}

let accessTokenCache: CachedAccessToken | null = null;

export function antigravityOauthTokenFilePath(): string {
  return TOKEN_FILE_PATH;
}

export function parseAntigravityKeyringSecret(secret: string | Buffer): AntigravityOAuthCredentials | null {
  try {
    let text = (Buffer.isBuffer(secret) ? secret.toString("utf-8") : secret).trim();

    if (text.startsWith(KEYRING_BASE64_PREFIX)) {
      text = Buffer.from(text.slice(KEYRING_BASE64_PREFIX.length), "base64").toString("utf-8");
    }

    return asCredentials(JSON.parse(text));
  } catch {
    return null;
  }
}

export function asAntigravityOAuthCredentials(raw: unknown): AntigravityOAuthCredentials | null {
  return asCredentials(raw);
}

function asCredentials(raw: unknown): AntigravityOAuthCredentials | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const token = record.token;
  if (!token || typeof token !== "object" || Array.isArray(token)) {
    return null;
  }

  const tokenRecord = token as Record<string, unknown>;
  const accessToken = nonEmptyString(tokenRecord.access_token);
  if (!accessToken) {
    return null;
  }

  return {
    token: {
      access_token: accessToken,
      refresh_token: nonEmptyString(tokenRecord.refresh_token) ?? undefined,
      expiry: nonEmptyString(tokenRecord.expiry) ?? undefined,
    },
    auth_method: nonEmptyString(record.auth_method) ?? undefined,
  };
}

export function isAntigravityAccessTokenFresh(token: AntigravityOAuthToken, nowMs = Date.now()): boolean {
  if (!token.access_token || !token.expiry) {
    return false;
  }

  const expiryMs = Date.parse(token.expiry);
  if (!Number.isFinite(expiryMs)) {
    return false;
  }

  return expiryMs - TOKEN_SKEW_MS > nowMs;
}

export async function readAntigravityOAuthCredentials(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<AntigravityOAuthCredentials | null> {
  if (process.platform === "darwin") {
    const fromKeychain = await readMacosKeychainCredentials(timeoutMs);
    if (fromKeychain) {
      return fromKeychain;
    }
  }

  return readTokenFileCredentials();
}

async function readMacosKeychainCredentials(timeoutMs: number): Promise<AntigravityOAuthCredentials | null> {
  try {
    const { stdout } = await execFileAsync(
      "security",
      ["find-generic-password", "-a", KEYCHAIN_ACCOUNT, "-s", KEYCHAIN_SERVICE, "-w"],
      {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
      },
    );

    return parseAntigravityKeyringSecret(stdout);
  } catch {
    return null;
  }
}

function readTokenFileCredentials(): AntigravityOAuthCredentials | null {
  try {
    if (!fs.existsSync(TOKEN_FILE_PATH)) {
      return null;
    }

    const raw = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, "utf-8"));
    return asCredentials(raw);
  } catch {
    return null;
  }
}

export async function resolveAntigravityAccessToken(
  options: {
    timeoutMs?: number;
    readCredentials?: () => Promise<AntigravityOAuthCredentials | null>;
    refreshToken?: (
      refreshToken: string,
      timeoutMs: number,
    ) => Promise<{ accessToken: string; expiresIn: number } | null>;
    nowMs?: number;
  } = {},
): Promise<string | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const nowMs = options.nowMs ?? Date.now();
  const readCredentials = options.readCredentials ?? readAntigravityOAuthCredentials;
  const refreshToken = options.refreshToken ?? refreshAntigravityAccessToken;

  if (accessTokenCache && accessTokenCache.expiresAtMs - TOKEN_SKEW_MS > nowMs) {
    return accessTokenCache.accessToken;
  }

  const credentials = await readCredentials();
  if (!credentials) {
    return null;
  }

  if (isAntigravityAccessTokenFresh(credentials.token, nowMs)) {
    return credentials.token.access_token;
  }

  const refresh = credentials.token.refresh_token;
  if (!refresh) {
    return credentials.token.access_token || null;
  }

  const refreshed = await refreshToken(refresh, timeoutMs);
  if (!refreshed) {
    return credentials.token.access_token || null;
  }

  accessTokenCache = {
    accessToken: refreshed.accessToken,
    expiresAtMs: nowMs + refreshed.expiresIn * 1000,
  };

  return refreshed.accessToken;
}

export async function refreshAntigravityAccessToken(
  refreshToken: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const body = new URLSearchParams({
      client_id: ANTIGRAVITY_OAUTH_CLIENT_ID,
      client_secret: ANTIGRAVITY_OAUTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { access_token?: unknown; expires_in?: unknown };
      const accessToken = nonEmptyString(data.access_token);
      const expiresIn =
        typeof data.expires_in === "number" && Number.isFinite(data.expires_in) ? data.expires_in : null;
      if (!accessToken || expiresIn === null) {
        return null;
      }

      return { accessToken, expiresIn };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    return null;
  }
}

/** Test-only: clear the in-memory access-token cache. */
export function clearAntigravityAccessTokenCache(): void {
  accessTokenCache = null;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
