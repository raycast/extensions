// Keito OAuth (WorkOS Connect): authorization code flow with S256 PKCE for a public client.
// No client secret exists. Tokens never appear in errors, logs, or URLs.
import { createHash, randomBytes } from "crypto";
import { KeitoError } from "./errors";
import { FetchLike, KeitoAuthProvider } from "./http";
import { Lock } from "./lock";

export const KEITO_OAUTH = {
  clientId: "client_01M52K79JXK4NXVH05RY87VZ9P",
  authorizeUrl: "https://auth.keito.ai/oauth2/authorize",
  tokenUrl: "https://auth.keito.ai/oauth2/token",
  scope: "openid profile email offline_access",
  // Raycast's static web redirect. "Extension" is literal, not this extension's package name.
  redirectUri: "https://raycast.com/redirect?packageName=Extension",
} as const;

export type KeitoOAuthConfig = typeof KEITO_OAUTH;

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  /** Epoch milliseconds; undefined when the server did not report expires_in. */
  expiresAt?: number;
}

export interface TokenStore {
  get(): Promise<StoredTokens | undefined>;
  set(tokens: StoredTokens): Promise<void>;
  remove(): Promise<void>;
}

/** Runs the browser part of the flow. Raycast generates state and the PKCE verifier/challenge. */
export interface Authorizer {
  authorize(request: { nonce: string }): Promise<{ code: string; codeVerifier: string; redirectUri: string }>;
}

export interface KeitoOAuthDeps {
  store: TokenStore;
  fetch?: FetchLike;
  authorizer?: Authorizer;
  config?: KeitoOAuthConfig;
  now?: () => number;
  nonce?: () => string;
  /** Called after a successful interactive sign-in, e.g. to forget the previously verified identity. */
  onSignIn?: () => Promise<void>;
  /** Serializes refreshes across Raycast commands, which run in separate processes. */
  lock?: Lock;
  timeoutMs?: number;
}

/** Refresh this long before expiry. Keito access tokens currently last 300 seconds. */
const EXPIRY_SKEW_MS = 30_000;

/** The refresh token (or code) was rejected; the user must sign in again. */
class GrantError extends Error {}

interface TokenResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  id_token?: unknown;
  expires_in?: unknown;
  error?: unknown;
  error_description?: unknown;
}

function base64UrlJson(segment: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
}

/** Claims from an ID token. The token comes straight from the token endpoint over TLS (OIDC core 3.1.3.7). */
export function idTokenClaims(idToken: string | undefined): Record<string, unknown> | undefined {
  const payload = idToken?.split(".")[1];
  return payload ? base64UrlJson(payload) : undefined;
}

/** Stable, non-secret identifier for the signed-in account, used to scope the verified identity. */
export function oauthFingerprint(tokens: StoredTokens | undefined, config: KeitoOAuthConfig = KEITO_OAUTH): string {
  const sub = idTokenClaims(tokens?.idToken)?.sub;
  return createHash("sha256")
    .update(`oauth\n${config.clientId}\n${typeof sub === "string" ? sub : ""}`)
    .digest("hex")
    .slice(0, 16);
}

export class KeitoOAuth {
  private readonly config: KeitoOAuthConfig;
  private readonly fetchImpl: FetchLike;
  private readonly now: () => number;
  private refreshing?: Promise<StoredTokens | undefined>;
  private signingIn?: Promise<StoredTokens>;

  constructor(private readonly deps: KeitoOAuthDeps) {
    this.config = deps.config ?? KEITO_OAUTH;
    this.fetchImpl = deps.fetch ?? (globalThis.fetch as unknown as FetchLike);
    this.now = deps.now ?? Date.now;
  }

  private isFresh(tokens: StoredTokens): boolean {
    return tokens.expiresAt === undefined || this.now() < tokens.expiresAt - EXPIRY_SKEW_MS;
  }

  private async tokenRequest(params: Record<string, string>): Promise<StoredTokens> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.deps.timeoutMs ?? 30000);
    let status: number;
    let raw: string;
    try {
      const response = await this.fetchImpl(this.config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams(params).toString(),
        signal: controller.signal,
      });
      status = response.status;
      raw = await response.text();
    } catch {
      throw new KeitoError(
        controller.signal.aborted ? "timeout" : "network",
        "Could not reach Keito's sign-in service. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timer);
    }

    let body: TokenResponse = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      // handled below
    }
    if (status >= 500)
      throw new KeitoError("server", "Keito's sign-in service had an error. Try again shortly.", { status });
    if (status === 429)
      throw new KeitoError("rate_limited", "Keito's sign-in service is rate limiting requests.", { status });
    if (status < 200 || status >= 300 || typeof body.access_token !== "string" || !body.access_token) {
      const code = typeof body.error === "string" ? body.error : undefined;
      if (status >= 400 && status < 500) throw new GrantError(code ?? `HTTP ${status}`);
      throw new KeitoError("unexpected_response", "Keito's sign-in service returned an unexpected response.", {
        status,
      });
    }
    const expiresIn = typeof body.expires_in === "number" ? body.expires_in : Number(body.expires_in);
    return {
      accessToken: body.access_token,
      refreshToken: typeof body.refresh_token === "string" && body.refresh_token ? body.refresh_token : undefined,
      idToken: typeof body.id_token === "string" && body.id_token ? body.id_token : undefined,
      expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? this.now() + expiresIn * 1000 : undefined,
    };
  }

  /** Interactive sign-in. Concurrent calls share one browser flow. */
  signIn(): Promise<StoredTokens> {
    if (!this.signingIn) this.signingIn = this.doSignIn().finally(() => (this.signingIn = undefined));
    return this.signingIn;
  }

  private async doSignIn(): Promise<StoredTokens> {
    if (!this.deps.authorizer) throw new KeitoError("signed_out", "Sign in to Keito to continue.");
    const nonce = this.deps.nonce?.() ?? randomBytes(24).toString("base64url");
    const { code, codeVerifier, redirectUri } = await this.deps.authorizer.authorize({ nonce });
    if (redirectUri !== this.config.redirectUri) {
      throw new KeitoError("unexpected_response", "Raycast used a different OAuth redirect URI than Keito expects.");
    }
    let tokens: StoredTokens;
    try {
      tokens = await this.tokenRequest({
        grant_type: "authorization_code",
        client_id: this.config.clientId,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      });
    } catch (error) {
      if (error instanceof GrantError) {
        throw new KeitoError(
          "signed_out",
          `Keito did not accept the sign-in (${error.message}). Try signing in again.`,
        );
      }
      throw error;
    }
    if (tokens.idToken) {
      const claims = idTokenClaims(tokens.idToken);
      const aud = claims?.aud;
      const audiences = Array.isArray(aud) ? aud : [aud];
      if (claims?.nonce !== nonce || (aud !== undefined && !audiences.includes(this.config.clientId))) {
        throw new KeitoError(
          "signed_out",
          "Keito's sign-in response did not match this request. Try signing in again.",
        );
      }
    }
    await this.deps.store.set(tokens);
    await this.deps.onSignIn?.();
    return tokens;
  }

  /** Refresh with rotation. One refresh at a time per process. */
  private refresh(): Promise<StoredTokens | undefined> {
    if (!this.refreshing) this.refreshing = this.doRefresh().finally(() => (this.refreshing = undefined));
    return this.refreshing;
  }

  private async doRefresh(): Promise<StoredTokens | undefined> {
    const seen = await this.deps.store.get();
    const run = () => this.refreshLocked(seen?.refreshToken);
    return this.deps.lock ? this.deps.lock(run) : run();
  }

  /**
   * Runs while holding the cross-command lock, so the read, token request, and save or removal
   * can't interleave with another command's refresh.
   */
  private async refreshLocked(seenRefreshToken: string | undefined): Promise<StoredTokens | undefined> {
    const current = await this.deps.store.get();
    if (!current?.refreshToken) return undefined;
    // Another command rotated the tokens while this one waited for the lock: use them.
    if (seenRefreshToken && current.refreshToken !== seenRefreshToken && this.isFresh(current)) return current;
    try {
      const next = await this.tokenRequest({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        refresh_token: current.refreshToken,
      });
      // Keep the previous refresh token only if the server did not rotate it, and keep the ID
      // token (it identifies the account) when a refresh response omits it.
      const merged: StoredTokens = {
        ...next,
        refreshToken: next.refreshToken ?? current.refreshToken,
        idToken: next.idToken ?? current.idToken,
      };
      await this.deps.store.set(merged);
      return merged;
    } catch (error) {
      if (!(error instanceof GrantError)) throw error;
      // Without a lock (or if a command signed in meanwhile), newer tokens may already be stored.
      const latest = await this.deps.store.get();
      if (latest?.refreshToken && latest.refreshToken !== current.refreshToken) return latest;
      // The stored refresh token itself was rejected: sign out.
      await this.deps.store.remove();
      return undefined;
    }
  }

  /** A valid access token, refreshing or (when interactive) signing in as needed. */
  async getAccessToken({ interactive }: { interactive: boolean }): Promise<string> {
    const tokens = await this.deps.store.get();
    if (tokens && this.isFresh(tokens)) return tokens.accessToken;
    if (tokens?.refreshToken) {
      let refreshed = await this.refresh();
      // Tokens taken over from another command might already be close to expiry.
      if (refreshed && !this.isFresh(refreshed)) refreshed = await this.refresh();
      if (refreshed && this.isFresh(refreshed)) return refreshed.accessToken;
    }
    if (!interactive) throw new KeitoError("signed_out", "Sign in to Keito to continue.");
    return (await this.signIn()).accessToken;
  }

  async getTokens(): Promise<StoredTokens | undefined> {
    return this.deps.store.get();
  }

  async signOut(): Promise<void> {
    await this.deps.store.remove();
  }

  /** Auth provider for KeitoHttpClient: Bearer access token, no Keito-Account-Id header. */
  provider({ interactive }: { interactive: boolean }): KeitoAuthProvider {
    return {
      kind: "oauth",
      headers: async () => ({ Authorization: `Bearer ${await this.getAccessToken({ interactive })}` }),
      onUnauthorized: async () => !!(await this.refresh()),
    };
  }
}
