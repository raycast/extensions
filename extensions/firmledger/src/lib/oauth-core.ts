// OAuth 2.1 helpers for the FirmLedger MCP server (RFC 7591 registration, PKCE code
// exchange, refresh rotation, RFC 7009 revocation). Pure fetch, no Raycast imports.

export interface Endpoints {
  authorization: string;
  token: string;
  registration: string;
  revocation: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
}

export class OAuthError extends Error {
  code: string;
  constructor(message: string, code = "oauth_error") {
    super(message);
    this.name = "OAuthError";
    this.code = code;
  }
}

export const SCOPES = "mcp read:account write:account offline_access";

/** Resource indicator = the MCP address without any key-in-path suffix. */
export function resourceFor(endpoint: string): string {
  const u = new URL(endpoint);
  const path = u.pathname.replace(/\/fl_live_[^/]+$/, "").replace(/\/+$/, "");
  return `${u.origin}${path || "/mcp"}`;
}

export async function discover(endpoint: string): Promise<Endpoints> {
  const origin = new URL(endpoint).origin;
  const fallback: Endpoints = {
    authorization: `${origin}/oauth/authorize`,
    token: `${origin}/oauth/token`,
    registration: `${origin}/oauth/register`,
    revocation: `${origin}/oauth/revoke`,
  };
  try {
    const res = await fetch(`${origin}/.well-known/oauth-authorization-server`, { headers: { Accept: "application/json" } });
    if (!res.ok) return fallback;
    const m: any = await res.json();
    return {
      authorization: m.authorization_endpoint ?? fallback.authorization,
      token: m.token_endpoint ?? fallback.token,
      registration: m.registration_endpoint ?? fallback.registration,
      revocation: m.revocation_endpoint ?? fallback.revocation,
    };
  } catch {
    return fallback;
  }
}

async function post(url: string, body: Record<string, string>): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(body).toString(),
    });
  } catch (e) {
    throw new OAuthError(`Could not reach FirmLedger sign-in: ${e instanceof Error ? e.message : e}`, "network_error");
  }
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON */
  }
  if (!res.ok) throw new OAuthError(json.error_description ?? json.error ?? `HTTP ${res.status}`, json.error ?? "http_error");
  return json;
}

export async function registerClient(ep: Endpoints, redirectUri: string, name = "FirmLedger for Raycast"): Promise<string> {
  let res: Response;
  try {
    res = await fetch(ep.registration, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_name: name,
        redirect_uris: [redirectUri],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope: SCOPES,
      }),
    });
  } catch (e) {
    throw new OAuthError(`Could not reach FirmLedger: ${e instanceof Error ? e.message : e}`, "network_error");
  }
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.client_id)
    throw new OAuthError(
      json.error_description ?? json.error ?? `Client registration failed (HTTP ${res.status})`,
      json.error ?? "registration_failed",
    );
  return json.client_id as string;
}

export function exchangeCode(
  ep: Endpoints,
  p: { clientId: string; code: string; verifier: string; redirectUri: string; resource: string },
): Promise<TokenResponse> {
  return post(ep.token, {
    grant_type: "authorization_code",
    client_id: p.clientId,
    code: p.code,
    code_verifier: p.verifier,
    redirect_uri: p.redirectUri,
    resource: p.resource,
  });
}

export function refreshTokens(ep: Endpoints, p: { clientId: string; refreshToken: string; resource: string }): Promise<TokenResponse> {
  return post(ep.token, { grant_type: "refresh_token", client_id: p.clientId, refresh_token: p.refreshToken, resource: p.resource });
}

/** RFC 7009: the server always answers 200; ends access on FirmLedger's side. */
export async function revokeToken(ep: Endpoints, token: string, clientId?: string): Promise<void> {
  try {
    await post(ep.revocation, { token, ...(clientId ? { client_id: clientId } : {}) });
  } catch {
    /* best effort */
  }
}
