// The OAuth 2.1 + PKCE pieces every extension shares: dynamic client
// registration, the token endpoint, and reading the ID token. Hosts supply the
// interactive part (a browser redirect in Raycast, a dialog in Office) and the
// storage; session.ts holds the rules for using these together.
import { type Endpoints, OAUTH_SCOPE } from "./config";

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  token_type?: string;
};

/** The token endpoint's answers that mean the grant itself is gone, as opposed to a failed request. */
const DEAD_GRANT = new Set(["invalid_grant", "invalid_client", "unauthorized_client"]);

export class TokenError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
  /** True when signing in again is the only way forward; false for an outage worth riding out. */
  get dead() {
    return this.code !== undefined && DEAD_GRANT.has(this.code);
  }
}

export async function tokenRequest(endpoints: Endpoints, params: Record<string, string>): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await fetch(endpoints.token, {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, resource: endpoints.resource }),
    });
  } catch {
    throw new TokenError("Couldn't reach Twelfth to renew your sign-in. Try again shortly.");
  }
  const body = (await response.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !body.access_token) {
    throw new TokenError(
      body.error_description ?? body.error ?? `Twelfth sign-in failed (${response.status})`,
      body.error,
    );
  }
  return body as TokenResponse;
}

export type ClientRegistration = {
  /** Shown on the consent page and in Settings → AI & agents. */
  name: string;
  uri: string;
  /** Must be https on a real host: the server refuses app-scheme redirects for public clients. */
  redirectUri: string;
  /** More redirects the same client may use (the Excel add-in's browser callback). */
  extraRedirectUris?: string[];
  /**
   * A pre-registered client id (Core's mcp-static-clients.json). When set,
   * nothing registers: first-party clients keep one id across installs, so a
   * person's consent carries to their next device.
   */
  staticClientId?: string;
};

/**
 * Register this install as a public PKCE client. The server allows open
 * dynamic client registration, so each install registers itself once (as
 * every MCP client does) and keeps the id. No secret.
 */
export async function registerClient(endpoints: Endpoints, client: ClientRegistration): Promise<string> {
  const response = await fetch(endpoints.register, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: client.name,
      client_uri: client.uri,
      redirect_uris: [client.redirectUri, ...(client.extraRedirectUris ?? [])],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: OAUTH_SCOPE,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { client_id?: string; error_description?: string };
  if (!response.ok || !body.client_id) {
    throw new Error(body.error_description ?? `Couldn't register with Twelfth (${response.status})`);
  }
  return body.client_id;
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** A URL-safe random string: PKCE verifiers and `state`. */
export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** The S256 challenge for a PKCE verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** The signed-in person's email from an ID token, so "mine" can be told apart. Unverified: display only. */
export function emailFromIdToken(idToken: string | undefined): string | undefined {
  if (!idToken) return undefined;
  try {
    const part = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = new TextDecoder().decode(Uint8Array.from(atob(part), (c) => c.charCodeAt(0)));
    const email = (JSON.parse(json) as { email?: unknown }).email;
    return typeof email === "string" ? email.toLowerCase() : undefined;
  } catch {
    // An unreadable ID token only costs the "mine" filter.
    return undefined;
  }
}
