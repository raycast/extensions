import { AuthenticationError } from "../../domain/errors";
import { MCP_RESOURCE, REQUIRED_SCOPES } from "./oauthMetadata";
import type { AuthProvider, AuthTarget } from "./AuthProvider";
import type { OAuthClientPort, StoredOAuthTokens, ValidatedTokenResponse } from "./OAuthClientPort";
import { isOAuthSessionKey, type OAuthSessionKeyStorePort } from "./OAuthSessionKeyStore";

export const OPENAPI_RESOURCE = "https://api.ticktick.com/open/v1/";
// Raycast's PKCE client generates this literal redirect for every extension
// (verified live on Raycast for Windows 0.71: packageName is the fixed word
// "Extension", not the extension's manifest name).
export const OAUTH_REDIRECT_URI = "https://raycast.com/redirect?packageName=Extension";
const RESOURCE_BY_TARGET: Record<AuthTarget, string> = { mcp: MCP_RESOURCE, openapi: OPENAPI_RESOURCE };
const REQUIRED_SCOPE = REQUIRED_SCOPES.join(" ");
const requiredScopes = new Set(REQUIRED_SCOPES);
type Endpoints = { authorizationEndpoint: string; tokenEndpoint: string };
type FetchPort = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export interface OAuthAuthProviderOptions {
  target: AuthTarget;
  endpoints: Endpoints;
  clientId: () => string | Promise<string>;
  client: OAuthClientPort;
  fetch: FetchPort;
  sessionStore: OAuthSessionKeyStorePort;
  randomUUID: () => string;
  clearAccount: (key: string) => Promise<void>;
}

export class OAuthAuthProvider implements AuthProvider {
  readonly target: AuthTarget;
  private readonly resource: string;
  constructor(private readonly options: OAuthAuthProviderOptions) {
    this.target = options.target;
    this.resource = RESOURCE_BY_TARGET[options.target];
  }
  async getAccessToken(): Promise<string> {
    const tokens: unknown = await this.options.client.getTokens();
    const priorKey = await this.validSessionKey();
    if (tokens === undefined) {
      if (priorKey) await this.clearSession(priorKey);
      return this.authorize();
    }
    if (!isStoredTokens(tokens)) {
      await this.clearSession(priorKey);
      return this.authorize();
    }
    if (!tokens.isExpired) {
      await this.ensureSession();
      return tokens.accessToken.trim();
    }
    const refresh = tokens.refreshToken?.trim();
    if (refresh && tokens.expiresIn !== undefined) {
      try {
        return await this.refresh(refresh);
      } catch {
        await this.clearSession(priorKey);
        return this.authorize();
      }
    }
    await this.clearSession(priorKey);
    return this.authorize();
  }
  async invalidate(): Promise<void> {
    await this.clearSession(await this.validSessionKey());
  }
  async accountCacheKey(): Promise<string> {
    await this.getAccessToken();
    const key = await this.validSessionKey();
    if (!key) throw new AuthenticationError("OAuth authorization could not be completed safely.");
    return key;
  }
  private async validSessionKey(): Promise<string | undefined> {
    const key: unknown = await this.options.sessionStore.get();
    if (key === undefined || isOAuthSessionKey(key)) return key;
    await this.options.sessionStore.remove();
    return undefined;
  }
  private async ensureSession(): Promise<string> {
    const key = await this.validSessionKey();
    if (key) return key;
    const next = `oauth:${this.options.randomUUID()}`;
    if (!isOAuthSessionKey(next)) throw new AuthenticationError("OAuth authorization could not be completed safely.");
    await this.options.sessionStore.set(next);
    return next;
  }
  private async clearSession(key: string | undefined): Promise<void> {
    try {
      await this.options.client.removeTokens();
    } finally {
      try {
        if (key) await this.options.clearAccount(key);
      } finally {
        await this.options.sessionStore.remove();
      }
    }
  }
  private async authorize(): Promise<string> {
    const clientId = await this.clientId();
    const request = await this.options.client.authorizationRequest({
      endpoint: this.options.endpoints.authorizationEndpoint,
      clientId,
      scope: REQUIRED_SCOPE,
      extraParameters: { resource: this.resource },
    });
    if (request.redirectURI !== OAUTH_REDIRECT_URI || !request.codeVerifier.trim())
      throw new AuthenticationError("OAuth authorization could not be completed safely.");
    const response = await this.options.client.authorize(request);
    const code = response.authorizationCode.trim();
    if (!code) throw new AuthenticationError("OAuth authorization could not be completed safely.");
    const token = await this.requestToken({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      redirect_uri: request.redirectURI,
      code_verifier: request.codeVerifier,
      resource: this.resource,
    });
    await this.options.client.setTokens(token);
    await this.ensureSession();
    return token.access_token;
  }
  private async refresh(refreshToken: string): Promise<string> {
    const token = await this.requestToken({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: await this.clientId(),
      resource: this.resource,
    });
    await this.options.client.setTokens(token, refreshToken);
    await this.ensureSession();
    return token.access_token;
  }
  private async clientId(): Promise<string> {
    const value = (await this.options.clientId()).trim();
    if (!value) throw new AuthenticationError("TickTick OAuth is not configured.");
    return value;
  }
  private async requestToken(fields: Record<string, string>): Promise<ValidatedTokenResponse> {
    let response: Response;
    try {
      response = await this.options.fetch(this.options.endpoints.tokenEndpoint, {
        method: "POST",
        redirect: "error",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fields).toString(),
      });
    } catch {
      throw new AuthenticationError("TickTick OAuth token exchange failed.");
    }
    if (!response.ok || response.redirected) throw new AuthenticationError("TickTick OAuth token exchange failed.");
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new AuthenticationError("TickTick returned an invalid OAuth token response.");
    }
    if (!isToken(data)) throw new AuthenticationError("TickTick returned an invalid OAuth token response.");
    return {
      ...data,
      access_token: data.access_token.trim(),
      refresh_token: data.refresh_token?.trim() || undefined,
      scope: data.scope ?? REQUIRED_SCOPE,
    };
  }
}
function hasRequiredScopes(scope: string): boolean {
  const scopes = new Set(scope.split(/\s+/));
  return [...requiredScopes].every((value) => scopes.has(value));
}
function isToken(data: unknown): data is ValidatedTokenResponse {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const v = data as Record<string, unknown>;
  return (
    typeof v.access_token === "string" &&
    !!v.access_token.trim() &&
    (v.token_type === "Bearer" || v.token_type === "bearer") &&
    (v.refresh_token === undefined || typeof v.refresh_token === "string") &&
    (v.expires_in === undefined ||
      (typeof v.expires_in === "number" && Number.isFinite(v.expires_in) && v.expires_in >= 0)) &&
    (v.scope === undefined || (typeof v.scope === "string" && hasRequiredScopes(v.scope)))
  );
}
function isStoredTokens(value: unknown): value is StoredOAuthTokens {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.accessToken === "string" &&
    !!v.accessToken.trim() &&
    typeof v.scope === "string" &&
    hasRequiredScopes(v.scope) &&
    typeof v.updatedAt === "object" &&
    v.updatedAt instanceof Date &&
    !Number.isNaN(v.updatedAt.valueOf()) &&
    typeof v.isExpired === "boolean" &&
    (v.refreshToken === undefined || typeof v.refreshToken === "string") &&
    (v.expiresIn === undefined || (typeof v.expiresIn === "number" && Number.isFinite(v.expiresIn) && v.expiresIn >= 0))
  );
}
