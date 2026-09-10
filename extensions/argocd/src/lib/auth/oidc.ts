/**
 * The OIDC authorization code flow with PKCE, plus the refresh that makes it worth having.
 *
 * The point of this module is that the operator logs in once, in a browser, and is never asked
 * again: the identity provider returns a refresh token alongside the id token, and every later
 * request mints a fresh id token from it silently. Pasting a bearer token by hand is what this
 * replaces.
 *
 * Everything here is a pure function over injected `fetch` and randomness, so the whole flow
 * can be exercised without a browser, a server or a network. The parts that cannot be
 * (listening on a loopback port, opening a browser) live in `ui/oidcLogin.ts` and are kept as
 * thin as possible.
 *
 * A note on the client: this needs a **public** OIDC client, one whose token endpoint auth
 * method is `none`. ArgoCD's own web client is confidential, and an unauthenticated token
 * exchange against it is refused with `invalid_client`. ArgoCD provides `oidc.cliClientID` in
 * argocd-cm precisely so a public client can be used for this, and `/api/v1/settings` exposes
 * it, which is where `resolveClientId` reads it from.
 */

export interface OidcEndpoints {
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string | undefined;
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export interface AuthorizeRequest {
  url: string;
  state: string;
  verifier: string;
}

export interface TokenSet {
  /** The bearer token ArgoCD accepts. */
  idToken: string;
  refreshToken: string | undefined;
  /** Epoch milliseconds, decoded from the id token, or derived from expires_in. */
  expiresAt: number | undefined;
}

export class OidcError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
  ) {
    super(message);
    this.name = "OidcError";
  }
}

/** Raised when the token endpoint refuses the client itself, which needs a config change. */
export class PublicClientRequiredError extends OidcError {
  constructor(readonly clientId: string) {
    super(
      "The identity provider refused this client for a login without a secret. ArgoCD's web client is confidential; set oidc.cliClientID in argocd-cm to a public client that allows PKCE.",
      "invalid_client",
    );
    this.name = "PublicClientRequiredError";
  }
}

export interface DiscoveryDeps {
  fetch: typeof globalThis.fetch;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function discoveryUrl(issuer: string): string {
  const base = issuer.replace(/\/+$/, "");
  return `${base}/.well-known/openid-configuration`;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function discover(issuer: string, deps: DiscoveryDeps): Promise<OidcEndpoints> {
  let response: Response;
  try {
    response = await deps.fetch(discoveryUrl(issuer), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch {
    throw new OidcError(`Could not reach the identity provider at ${issuer}.`, "unreachable");
  }
  if (!response.ok) {
    throw new OidcError(`The identity provider at ${issuer} answered ${response.status}.`, "discovery");
  }

  let body: Record<string, unknown>;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new OidcError(`The identity provider at ${issuer} did not return JSON.`, "discovery");
  }

  const authorizationEndpoint = asString(body.authorization_endpoint);
  const tokenEndpoint = asString(body.token_endpoint);
  if (!authorizationEndpoint || !tokenEndpoint) {
    throw new OidcError(
      "The identity provider's metadata has no authorization or token endpoint.",
      "discovery",
    );
  }

  return {
    issuer: asString(body.issuer) ?? issuer,
    authorizationEndpoint,
    tokenEndpoint,
    revocationEndpoint: asString(body.revocation_endpoint),
  };
}

/** base64url, which is what PKCE and JWTs use, and what `+/=` would break. */
export function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export interface PkceDeps {
  randomBytes: (length: number) => Uint8Array;
  sha256: (input: string) => Uint8Array;
}

/**
 * 32 bytes of entropy is the RFC 7636 recommendation, and S256 is the only challenge method
 * worth using: `plain` puts the verifier on the wire.
 */
export function createPkce(deps: PkceDeps): PkcePair {
  const verifier = base64Url(deps.randomBytes(32));
  return { verifier, challenge: base64Url(deps.sha256(verifier)) };
}

export interface AuthorizeOptions {
  endpoints: Pick<OidcEndpoints, "authorizationEndpoint">;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  pkce: PkcePair;
  state: string;
}

export function buildAuthorizeUrl(options: AuthorizeOptions): string {
  const url = new URL(options.endpoints.authorizationEndpoint);
  const params = url.searchParams;
  params.set("client_id", options.clientId);
  params.set("response_type", "code");
  params.set("redirect_uri", options.redirectUri);
  // offline_access is what makes the provider issue a refresh token, and the refresh token is
  // the whole reason this flow beats pasting one.
  params.set("scope", withOfflineAccess(options.scopes).join(" "));
  params.set("state", options.state);
  params.set("code_challenge", options.pkce.challenge);
  params.set("code_challenge_method", "S256");
  return url.toString();
}

export function withOfflineAccess(scopes: string[]): string[] {
  const normalized = scopes.length > 0 ? [...scopes] : ["openid", "profile", "email", "groups"];
  if (!normalized.includes("openid")) {
    normalized.unshift("openid");
  }
  if (!normalized.includes("offline_access")) {
    normalized.push("offline_access");
  }
  return normalized;
}

export interface CallbackResult {
  code: string;
  state: string;
}

/**
 * Reads the provider's redirect back to the loopback listener. The state check is the caller's
 * job, because only the caller knows what it sent.
 */
export function parseCallback(requestUrl: string, base = "http://127.0.0.1"): CallbackResult {
  let url: URL;
  try {
    url = new URL(requestUrl, base);
  } catch {
    throw new OidcError("The identity provider redirected to something that is not a URL.", "callback");
  }

  const error = url.searchParams.get("error");
  if (error) {
    const description = url.searchParams.get("error_description");
    throw new OidcError(description ? `${error}: ${description}` : error, error);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    throw new OidcError("The identity provider's redirect carried no authorization code.", "callback");
  }
  return { code, state };
}

/** Decodes the `exp` claim. Decode only, never verify: the server is the authority. */
export function decodeExpiry(token: string): number | undefined {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return undefined;
  }
  const payload = segments[1];
  if (!payload) {
    return undefined;
  }
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown };
    return typeof claims.exp === "number" && Number.isFinite(claims.exp) ? claims.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

export interface TokenExchangeDeps {
  fetch: typeof globalThis.fetch;
  now: () => number;
  timeoutMs?: number;
}

async function postToken(
  tokenEndpoint: string,
  body: URLSearchParams,
  clientId: string,
  deps: TokenExchangeDeps,
): Promise<TokenSet> {
  let response: Response;
  try {
    response = await deps.fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString(),
      signal: AbortSignal.timeout(deps.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
  } catch {
    throw new OidcError("Could not reach the identity provider's token endpoint.", "unreachable");
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    // Left empty on purpose: an error is reported from the status below rather than from a
    // body that could not be read.
  }

  if (!response.ok) {
    const code = asString(payload.error);
    if (code === "invalid_client") {
      throw new PublicClientRequiredError(clientId);
    }
    const description = asString(payload.error_description);
    throw new OidcError(
      description ?? `The identity provider answered ${response.status} on the token endpoint.`,
      code,
    );
  }

  const idToken = asString(payload.id_token);
  if (!idToken) {
    throw new OidcError(
      "The identity provider returned no id token, which is what ArgoCD accepts as a bearer token.",
      "no_id_token",
    );
  }

  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : undefined;
  return {
    idToken,
    refreshToken: asString(payload.refresh_token),
    // The claim is authoritative over expires_in, which is relative to a clock we do not share.
    expiresAt: decodeExpiry(idToken) ?? (expiresIn === undefined ? undefined : deps.now() + expiresIn * 1000),
  };
}

export interface ExchangeOptions {
  endpoints: Pick<OidcEndpoints, "tokenEndpoint">;
  clientId: string;
  redirectUri: string;
  code: string;
  verifier: string;
}

export function exchangeCode(options: ExchangeOptions, deps: TokenExchangeDeps): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    code: options.code,
    code_verifier: options.verifier,
  });
  return postToken(options.endpoints.tokenEndpoint, body, options.clientId, deps);
}

export interface RefreshOptions {
  endpoints: Pick<OidcEndpoints, "tokenEndpoint">;
  clientId: string;
  refreshToken: string;
  scopes: string[];
}

/**
 * The silent half. A provider may or may not rotate the refresh token; when it returns a new
 * one it replaces the old, and when it does not the old one stays valid, so the caller keeps
 * whichever it has.
 */
export async function refreshTokens(options: RefreshOptions, deps: TokenExchangeDeps): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: options.clientId,
    refresh_token: options.refreshToken,
    scope: withOfflineAccess(options.scopes).join(" "),
  });
  const tokens = await postToken(options.endpoints.tokenEndpoint, body, options.clientId, deps);
  return { ...tokens, refreshToken: tokens.refreshToken ?? options.refreshToken };
}
