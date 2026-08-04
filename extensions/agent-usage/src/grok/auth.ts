import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const OIDC_SCOPE_PREFIX = "https://auth.x.ai::";
const LEGACY_SESSION_SCOPE = "https://accounts.x.ai/sign-in";
const DEFAULT_OIDC_ISSUER = "https://auth.x.ai";
/** Refresh slightly before local expires_at so requests don't race the clock. */
const TOKEN_REFRESH_SKEW_MS = 60_000;
const TOKEN_REQUEST_TIMEOUT_MS = 15_000;

export interface GrokCredentials {
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  authMode: string | null;
  userId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  teamId: string | null;
  expiresAt: Date | null;
  oidcClientId: string | null;
  oidcIssuer: string | null;
}

export interface GrokRefreshedTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}

interface AuthEntryCandidate {
  scope: string;
  entry: Record<string, unknown>;
}

function grokHomeDir(): string {
  const custom = process.env.GROK_HOME?.trim();
  if (custom) {
    if (custom === "~") return os.homedir();
    if (custom.startsWith("~/") || custom.startsWith("~\\")) {
      return path.join(os.homedir(), custom.slice(2));
    }
    return custom;
  }
  return path.join(os.homedir(), ".grok");
}

export function getGrokAuthFilePath(): string {
  return path.join(grokHomeDir(), "auth.json");
}

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extractClientIdFromScope(scope: string): string | null {
  if (!scope.startsWith(OIDC_SCOPE_PREFIX)) return null;
  const id = scope.slice(OIDC_SCOPE_PREFIX.length).trim();
  return id || null;
}

function entryExpiresAtMs(entry: Record<string, unknown>): number | null {
  const expiresAt = parseDate(entry.expires_at);
  return expiresAt ? expiresAt.getTime() : null;
}

function isEntryExpired(entry: Record<string, unknown>, nowMs: number): boolean {
  const expiresAtMs = entryExpiresAtMs(entry);
  if (expiresAtMs === null) return false;
  return nowMs >= expiresAtMs;
}

/**
 * Prefer non-expired OIDC entries, then newest expires_at, then stable scope order.
 * Falls back to legacy session scopes with the same ranking.
 */
function selectPreferredEntry(root: Record<string, unknown>): AuthEntryCandidate | null {
  const oidcCandidates: AuthEntryCandidate[] = [];
  const legacyCandidates: AuthEntryCandidate[] = [];

  for (const [scope, value] of Object.entries(root)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const key = nonEmptyString(entry.key);
    if (!key) continue;

    if (scope.startsWith(OIDC_SCOPE_PREFIX)) {
      oidcCandidates.push({ scope, entry });
    } else if (scope === LEGACY_SESSION_SCOPE || scope.includes("/sign-in")) {
      legacyCandidates.push({ scope, entry });
    }
  }

  const nowMs = Date.now();
  const rank = (candidates: AuthEntryCandidate[]): AuthEntryCandidate | null => {
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => {
      const aExpired = isEntryExpired(a.entry, nowMs) ? 1 : 0;
      const bExpired = isEntryExpired(b.entry, nowMs) ? 1 : 0;
      if (aExpired !== bExpired) return aExpired - bExpired;

      const aExp = entryExpiresAtMs(a.entry) ?? -Infinity;
      const bExp = entryExpiresAtMs(b.entry) ?? -Infinity;
      if (aExp !== bExp) return bExp - aExp;

      return a.scope.localeCompare(b.scope);
    })[0];
  };

  return rank(oidcCandidates) ?? rank(legacyCandidates);
}

function credentialsFromEntry(scope: string, entry: Record<string, unknown>): GrokCredentials | null {
  const accessToken = nonEmptyString(entry.key);
  if (!accessToken) return null;

  return {
    accessToken,
    refreshToken: nonEmptyString(entry.refresh_token),
    scope,
    authMode: nonEmptyString(entry.auth_mode),
    userId: nonEmptyString(entry.user_id),
    email: nonEmptyString(entry.email),
    firstName: nonEmptyString(entry.first_name),
    lastName: nonEmptyString(entry.last_name),
    teamId: nonEmptyString(entry.team_id),
    expiresAt: parseDate(entry.expires_at),
    oidcClientId: nonEmptyString(entry.oidc_client_id) ?? extractClientIdFromScope(scope),
    oidcIssuer: nonEmptyString(entry.oidc_issuer) ?? DEFAULT_OIDC_ISSUER,
  };
}

/**
 * Load Grok credentials from `~/.grok/auth.json` (or `$GROK_HOME/auth.json`).
 * Prefers SuperGrok OIDC entries, then legacy session scope.
 */
export function loadGrokCredentials(): GrokCredentials | null {
  const filePath = getGrokAuthFilePath();
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    if (!raw || typeof raw !== "object") return null;

    const preferred = selectPreferredEntry(raw as Record<string, unknown>);
    if (!preferred) return null;

    return credentialsFromEntry(preferred.scope, preferred.entry);
  } catch {
    return null;
  }
}

export function isGrokCredentialExpired(credentials: GrokCredentials, skewMs: number = 0): boolean {
  if (!credentials.expiresAt) return false;
  return Date.now() + skewMs >= credentials.expiresAt.getTime();
}

export function needsGrokTokenRefresh(credentials: GrokCredentials): boolean {
  return isGrokCredentialExpired(credentials, TOKEN_REFRESH_SKEW_MS);
}

export function getGrokDisplayName(credentials: GrokCredentials): string | null {
  const parts = [credentials.firstName, credentials.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export function getGrokLoginMethod(credentials: GrokCredentials): string | null {
  const mode = credentials.authMode?.toLowerCase();
  if (mode === "oidc") return "SuperGrok";
  if (mode === "session") return "session";
  return credentials.authMode;
}

async function resolveTokenEndpoint(issuer: string): Promise<string> {
  const base = issuer.replace(/\/+$/, "") || DEFAULT_OIDC_ISSUER;
  try {
    const response = await fetch(`${base}/.well-known/openid-configuration`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });
    if (response.ok) {
      const data = (await response.json()) as { token_endpoint?: unknown };
      if (typeof data.token_endpoint === "string" && data.token_endpoint.trim()) {
        return data.token_endpoint.trim();
      }
    }
  } catch {
    // Fall through to conventional path.
  }
  return `${base}/oauth2/token`;
}

/**
 * Exchange a refresh token for a new access token via the issuer's OAuth2 token endpoint.
 * Public clients (auth method "none") only need client_id + refresh_token.
 */
export async function refreshGrokAccessToken(credentials: GrokCredentials): Promise<GrokRefreshedTokens | null> {
  if (!credentials.refreshToken) return null;

  const clientId = credentials.oidcClientId ?? extractClientIdFromScope(credentials.scope);
  if (!clientId) return null;

  const issuer = credentials.oidcIssuer?.trim() || DEFAULT_OIDC_ISSUER;

  try {
    const tokenEndpoint = await resolveTokenEndpoint(issuer);
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
      client_id: clientId,
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      access_token?: unknown;
      refresh_token?: unknown;
      expires_in?: unknown;
    };

    const accessToken = nonEmptyString(data.access_token);
    if (!accessToken) return null;

    const expiresIn =
      typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
        ? data.expires_in
        : typeof data.expires_in === "string" && data.expires_in.trim()
          ? Number(data.expires_in)
          : null;

    return {
      accessToken,
      refreshToken: nonEmptyString(data.refresh_token) ?? credentials.refreshToken,
      expiresAt:
        expiresIn !== null && Number.isFinite(expiresIn) && expiresIn > 0
          ? new Date(Date.now() + expiresIn * 1000)
          : null,
    };
  } catch {
    return null;
  }
}

/** Best-effort write of refreshed tokens back into the matching auth.json scope entry. */
export function persistGrokRefreshedTokens(credentials: GrokCredentials, refreshed: GrokRefreshedTokens): void {
  const filePath = getGrokAuthFilePath();
  try {
    if (!fs.existsSync(filePath)) return;
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    if (!raw || typeof raw !== "object") return;

    const root = raw as Record<string, unknown>;
    const existing = root[credentials.scope];
    if (!existing || typeof existing !== "object") return;

    const nextEntry: Record<string, unknown> = {
      ...(existing as Record<string, unknown>),
      key: refreshed.accessToken,
    };
    if (refreshed.refreshToken) {
      nextEntry.refresh_token = refreshed.refreshToken;
    }
    if (refreshed.expiresAt) {
      nextEntry.expires_at = refreshed.expiresAt.toISOString();
    }

    root[credentials.scope] = nextEntry;
    fs.writeFileSync(filePath, `${JSON.stringify(root, null, 2)}\n`, "utf-8");
  } catch {
    // Best effort; in-memory token still usable for this request.
  }
}

export function applyGrokRefreshedTokens(
  credentials: GrokCredentials,
  refreshed: GrokRefreshedTokens,
): GrokCredentials {
  return {
    ...credentials,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: refreshed.expiresAt,
  };
}
