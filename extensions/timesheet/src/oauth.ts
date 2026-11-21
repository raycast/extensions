import { LaunchType, LocalStorage, OAuth, environment } from "@raycast/api";

/**
 * Timesheet's authorization server is an OAuth 2.1 public-client setup: PKCE with
 * S256, `token_endpoint_auth_method: none`, and unauthenticated dynamic client
 * registration (RFC 7591). It does not support client ID metadata documents, so the
 * extension registers its own client id on first sign-in the same way the Timesheet
 * CLI does, rather than shipping a baked-in one.
 *
 * Endpoints mirror MetadataService in the backend, which is the source of truth.
 */
const REGISTRATION_ENDPOINT = "https://api.timesheet.io/oauth2/register";
const AUTHORIZATION_ENDPOINT = "https://api.timesheet.io/oauth2/auth";
const TOKEN_ENDPOINT = "https://api.timesheet.io/oauth2/token";
const REVOCATION_ENDPOINT = "https://api.timesheet.io/oauth2/revoke";

/**
 * The static redirect URL Raycast uses for every extension on
 * `RedirectMethod.Web`. It has to be registered before the first authorization
 * request exists, so it cannot be read off the request itself.
 */
const REDIRECT_URI = "https://raycast.com/redirect?packageName=Extension";

/** Advertised by the server. Scopes are not enforced; permissions are data-level. */
const SCOPE = "openid profile email offline_access";

const CLIENT_ID_KEY = "oauth:client-id";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Timesheet",
  providerIcon: "icon.png",
  description: "Connect your Timesheet account to track time from Raycast.",
  // Signing out then also revokes the refresh token on the server (RFC 7009).
  revocationEndpoint: REVOCATION_ENDPOINT,
});

interface RegistrationResponse {
  client_id: string;
}

/**
 * Registers a public client for this install, once, and remembers the id. The server
 * expires stale public-client registrations on its own, so re-registering after the
 * id is lost is expected rather than exceptional.
 */
async function getClientId(): Promise<string> {
  const cached = await LocalStorage.getItem<string>(CLIENT_ID_KEY);
  if (cached) return cached;

  const response = await fetch(REGISTRATION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Timesheet for Raycast",
      redirect_uris: [REDIRECT_URI],
      grant_types: ["authorization_code", "refresh_token"],
      token_endpoint_auth_method: "none",
      client_uri: "https://timesheet.io",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Could not register with Timesheet (HTTP ${response.status}). Please try again, or set an API token in the extension preferences.`,
    );
  }

  const { client_id: clientId } =
    (await response.json()) as RegistrationResponse;
  await LocalStorage.setItem(CLIENT_ID_KEY, clientId);
  return clientId;
}

async function requestTokens(
  body: URLSearchParams,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Timesheet rejected the token request (HTTP ${response.status}).`,
    );
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function signIn(): Promise<string> {
  // The menu bar command refreshes on a timer. Opening the OAuth overlay from a
  // background launch would nag the user every interval, so fail quietly instead
  // and let them sign in the next time they open a command themselves.
  if (environment.launchType === LaunchType.Background) {
    throw new Error("Not signed in to Timesheet.");
  }

  const clientId = await getClientId();

  const authRequest = await client.authorizationRequest({
    endpoint: AUTHORIZATION_ENDPOINT,
    clientId,
    scope: SCOPE,
  });

  // The server matches redirect_uri exactly against the registered value, so a
  // Raycast-side change would fail confusingly at the consent screen instead of here.
  if (authRequest.redirectURI !== REDIRECT_URI) {
    throw new Error(
      `Raycast asked for the redirect URI ${authRequest.redirectURI}, but ${REDIRECT_URI} is registered. The extension needs updating.`,
    );
  }

  const { authorizationCode } = await client.authorize(authRequest);

  const tokens = await requestTokens(
    new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: authRequest.redirectURI,
      client_id: clientId,
      code_verifier: authRequest.codeVerifier,
    }),
  );

  await client.setTokens(tokens);
  return tokens.access_token;
}

async function refresh(refreshToken: string): Promise<string> {
  const clientId = await getClientId();

  const tokens = await requestTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  );

  // A refresh response may omit the refresh token, in which case the old one stands.
  await client.setTokens({
    ...tokens,
    refresh_token: tokens.refresh_token ?? refreshToken,
  });
  return tokens.access_token;
}

let pending: Promise<string> | null = null;

/**
 * Returns a usable access token, refreshing silently when possible. Only the first
 * sign-in opens the OAuth overlay, so background menu bar refreshes stay quiet once
 * the user has connected an account. Every API request calls this, so concurrent
 * callers share one refresh or sign-in instead of racing to open two overlays.
 */
export function authorize(): Promise<string> {
  if (!pending) {
    pending = resolveToken().finally(() => {
      pending = null;
    });
  }
  return pending;
}

async function resolveToken(): Promise<string> {
  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (!tokenSet.isExpired()) return tokenSet.accessToken;
    if (tokenSet.refreshToken) {
      try {
        return await refresh(tokenSet.refreshToken);
      } catch {
        // Fall through to a fresh sign-in: a rejected refresh token means the
        // grant is gone, and retrying it forever would just keep failing.
      }
    }
  }

  return signIn();
}

export async function signOut(): Promise<void> {
  await client.removeTokens();
  await LocalStorage.removeItem(CLIENT_ID_KEY);
}

export async function isSignedIn(): Promise<boolean> {
  const tokenSet = await client.getTokens();
  return Boolean(tokenSet?.accessToken);
}
