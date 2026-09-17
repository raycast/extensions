/**
 * SnapTrade OAuth for Raycast.
 *
 * SnapTrade Dashboard OAuth apps are confidential clients: the token, refresh and revoke calls need
 * HTTP Basic client_id:client_secret on top of PKCE. The secret can never ship inside an extension,
 * so those three calls go through the Folio auth worker (see /auth-worker). Everything else —
 * building the authorization URL, PKCE, the callback, token storage — happens here with Raycast's
 * OAuth.PKCEClient. Data requests go straight to SnapTrade with `Authorization: Bearer`.
 */
import { OAuth } from "@raycast/api";
import { getDiscovery } from "./discovery";
import { prefs } from "./preferences";

export const SCOPES = "read openid email";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly reason: "not-configured" | "signed-out" | "refresh-failed" | "worker",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "SnapTrade",
  providerIcon: "folio.png",
  providerId: "snaptrade",
  description: "Folio reads your portfolio through SnapTrade. Read-only: it can never place trades or move money.",
});

interface WorkerTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  token_type?: string;
}

function workerUrl(path: string): string {
  const base = prefs().authWorkerUrl;
  // https only, except a local wrangler dev server.
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base);
  if (!base || (!/^https:\/\//.test(base) && !local) || base.includes("example.workers.dev")) {
    throw new AuthError("Auth Worker URL is not configured. Open the extension preferences.", "not-configured");
  }
  return `${base}${path}`;
}

async function workerPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(workerUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    // non-JSON error body; handled below
  }
  if (!res.ok) {
    console.log("[folio-auth] worker error", {
      path,
      status: res.status,
      error: json.error,
      description: json.error_description,
    });
    const err = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    const desc = typeof json.error_description === "string" ? `: ${json.error_description}` : "";
    throw new AuthError(
      `Auth worker ${path} failed (${err}${desc})`,
      err === "invalid_grant" ? "refresh-failed" : "worker",
    );
  }
  return json as T;
}

/** Runs the full PKCE authorization-code flow and stores the resulting token set. */
export async function signIn(): Promise<void> {
  const { oauthClientId } = prefs();
  if (!oauthClientId) throw new AuthError("SnapTrade OAuth Client ID is not configured.", "not-configured");
  workerUrl("/"); // validate early so the user isn't bounced to a consent screen that can't complete
  const discovery = await getDiscovery();
  const request = await client.authorizationRequest({
    endpoint: discovery.authorization_endpoint,
    clientId: oauthClientId,
    scope: SCOPES,
    // Raycast adds response_type=code, state, code_challenge and code_challenge_method=S256 itself.
  });
  console.log("[folio-auth] opening consent page", {
    endpoint: discovery.authorization_endpoint,
    redirectUri: request.redirectURI,
  });
  const { authorizationCode } = await client.authorize(request);
  console.log("[folio-auth] authorization code received, exchanging via worker", { worker: prefs().authWorkerUrl });
  const tokens = await workerPost<WorkerTokenResponse>("/oauth/token", {
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: request.codeVerifier,
    redirect_uri: request.redirectURI,
  });
  await client.setTokens(tokens);
  console.log("[folio-auth] tokens stored", { expiresIn: tokens.expires_in, scope: tokens.scope });
}

let refreshInFlight: Promise<string> | null = null;

/** Refresh tokens rotate: the worker returns a new pair and we replace both atomically. Single-flight per process. */
async function refresh(refreshToken: string): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const tokens = await workerPost<WorkerTokenResponse>("/oauth/refresh", { refresh_token: refreshToken });
        if (!tokens.refresh_token) tokens.refresh_token = refreshToken;
        await client.setTokens(tokens);
        return tokens.access_token;
      } catch (e) {
        if (e instanceof AuthError && e.reason === "refresh-failed") {
          // Refresh token is dead (rotated elsewhere or revoked). Only a new sign-in can fix this.
          await client.removeTokens();
          throw new AuthError("Session expired. Sign in again.", "signed-out");
        }
        throw e;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * Returns a usable access token, refreshing first when expired (or when `force` is set after a 401).
 * Throws AuthError("signed-out") when the user needs to sign in.
 */
export async function getAccessToken(opts?: { force?: boolean }): Promise<string> {
  const tokens = await client.getTokens();
  if (!tokens?.accessToken) throw new AuthError("Not signed in.", "signed-out");
  const expired = tokens.expiresIn ? tokens.isExpired() : false;
  if ((expired || opts?.force) && tokens.refreshToken) {
    return refresh(tokens.refreshToken);
  }
  if (expired || opts?.force) {
    await client.removeTokens();
    throw new AuthError("Session expired. Sign in again.", "signed-out");
  }
  return tokens.accessToken;
}

export async function isSignedIn(): Promise<boolean> {
  const tokens = await client.getTokens();
  return Boolean(tokens?.accessToken);
}

/** Revokes the refresh token (and access token as a hint) through the worker, then forgets both. */
export async function signOut(): Promise<void> {
  const tokens = await client.getTokens();
  if (tokens?.refreshToken) {
    try {
      await workerPost("/oauth/revoke", { token: tokens.refreshToken, token_type_hint: "refresh_token" });
    } catch {
      // Best effort: local sign-out must succeed even if the worker is unreachable.
    }
  }
  await client.removeTokens();
}

/** Display-only claims from the id_token. Not verified; never sent anywhere. */
export async function sessionInfo(): Promise<{
  email?: string;
  sub?: string;
  scope?: string;
  updatedAt?: Date;
} | null> {
  const tokens = await client.getTokens();
  if (!tokens?.accessToken) return null;
  const out: { email?: string; sub?: string; scope?: string; updatedAt?: Date } = {
    scope: tokens.scope,
    updatedAt: tokens.updatedAt,
  };
  if (tokens.idToken) {
    try {
      const payload = tokens.idToken.split(".")[1] ?? "";
      const json = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      if (typeof json.email === "string") out.email = json.email;
      if (typeof json.sub === "string") out.sub = json.sub;
    } catch {
      // ignore malformed token
    }
  }
  return out;
}

/** The exact redirect URI Raycast uses; maintainers register this in the SnapTrade dashboard. */
export async function redirectUriForRegistration(): Promise<string> {
  const discovery = await getDiscovery();
  const request = await client.authorizationRequest({
    endpoint: discovery.authorization_endpoint,
    clientId: prefs().oauthClientId || "unset",
    scope: SCOPES,
  });
  return request.redirectURI;
}
