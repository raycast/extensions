// src/lib/auth.ts
// OAuth 2.0 client credentials service for Dynatrace SSO.
// Tokens are cached with a 30-second proactive refresh window.

import { Cache } from "@raycast/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TenantConfig {
  id: string;
  name: string;
  tenantEndpoint: string; // e.g. https://abc123.live.dynatrace.com
  clientId: string;
  clientSecret: string;
  ssoEndpoint: string; // default: https://sso.dynatrace.com/sso/oauth2/token
  scopes: string[]; // e.g. ["storage:logs:read", "storage:problems:read"]
  accountUrn?: string; // urn:dtaccount:<uuid> for account-level clients
}

interface CachedToken {
  access_token: string;
  exp: number; // Date.now() + expires_in * 1000
}

// ── Error class ───────────────────────────────────────────────────────────────

export class OAuthError extends Error {
  constructor(
    public statusCode: number,
    public body: string,
  ) {
    // Redact client_secret if it somehow appears in the error body
    const safeBody = body.replace(/client_secret=[^&\s]+/g, "client_secret=[REDACTED]");
    super(`OAuth error ${statusCode}: ${safeBody}`);
    this.name = "OAuthError";
  }
}

// ── Cache ─────────────────────────────────────────────────────────────────────

const tokenCache = new Cache({ namespace: "dt-oauth" });

const REFRESH_BUFFER_MS = 30_000; // refresh 30 seconds before expiry

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Returns a valid access token for the given tenant.
 * Caches tokens and proactively refreshes 30 seconds before expiry.
 */
export async function getAccessToken(tenant: TenantConfig): Promise<string> {
  const cacheKey = `token:${tenant.id}`;

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached) {
    try {
      const parsed: CachedToken = JSON.parse(cached);
      if (parsed.exp - Date.now() > REFRESH_BUFFER_MS) {
        return parsed.access_token;
      }
    } catch {
      // Corrupted cache entry — fall through to fetch
    }
  }

  // Fetch a new token
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: tenant.clientId,
    client_secret: tenant.clientSecret,
    scope: tenant.scopes.join(" "),
  });

  if (tenant.accountUrn) {
    params.set("resource", tenant.accountUrn);
  }

  const res = await fetch(tenant.ssoEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const body = await res.text();

  if (!res.ok) {
    throw new OAuthError(res.status, body);
  }

  let tokenData: { access_token: string; expires_in: number };
  try {
    tokenData = JSON.parse(body) as { access_token: string; expires_in: number };
  } catch {
    throw new OAuthError(res.status, `Failed to parse token response: ${body.slice(0, 200)}`);
  }

  const cacheEntry: CachedToken = {
    access_token: tokenData.access_token,
    exp: Date.now() + tokenData.expires_in * 1000,
  };

  tokenCache.set(cacheKey, JSON.stringify(cacheEntry));
  return tokenData.access_token;
}

/**
 * Validates tenant credentials by attempting to get an access token.
 * Returns { valid: true } on success, or { valid: false, error: string } on failure.
 * In mock mode, mock tenants always validate successfully.
 */
export async function validateTenantCredentials(
  tenant: TenantConfig,
): Promise<{ valid: true } | { valid: false; error: string }> {
  // Mock tenants always validate in mock mode
  if (tenant.clientId.includes("MOCK_")) {
    return { valid: true };
  }

  try {
    await getAccessToken(tenant);
    return { valid: true };
  } catch (err) {
    if (err instanceof OAuthError) {
      // Parse error messages
      if (err.statusCode === 400) {
        return { valid: false, error: "Invalid Client ID or Secret — check Dynatrace OAuth app settings" };
      }
      if (err.statusCode === 401) {
        return { valid: false, error: "Unauthorized — Client ID or Secret is incorrect" };
      }
      if (err.statusCode === 403) {
        return { valid: false, error: "Forbidden — check scopes and permissions" };
      }
      return { valid: false, error: `OAuth error ${err.statusCode}` };
    }
    if (err instanceof TypeError && err.message.includes("fetch")) {
      return { valid: false, error: "Cannot reach SSO endpoint — check URL and network" };
    }
    return { valid: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
