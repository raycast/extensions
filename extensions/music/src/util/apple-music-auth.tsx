import { Action, environment, Icon, LocalStorage, OAuth, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

// Apple Music authentication via Raycast's OAuth proxy. The auth handshake
// below follows the reference implementation the Raycast team supplied.
//
// The proxy owns both halves of the Apple Music credential pair:
//   GET  /developer-token  — a team-issued JWT (6-month life, rotated
//                            server-side). Unlike the token the web player
//                            ships, it carries no `root_https_origin` claim,
//                            so it is not pinned to an origin and the public
//                            api.music.apple.com host accepts it directly.
//   /authorize + /token    — a standard PKCE flow that yields the Music user
//                            token identifying this user's library.
//
// Neither token is persisted by us: the developer token is fetched per
// request, and the user token lives in Raycast's encrypted OAuth store via
// the PKCE client.

const PROXY_BASE_URL = "https://apple-music-oauth.raycast.com";
const API_BASE_URL = "https://api.music.apple.com";
const CLIENT_ID = "raycast";

const DEVELOPER_TOKEN_KEY = "apple-music.developer-token";
// Treat the developer token as stale an hour before it actually lapses, so a
// long-running command can't have it expire out from under it mid-flight.
const DEVELOPER_TOKEN_SKEW_MS = 60 * 60 * 1000;
// Cheapest authenticated endpoint Apple exposes — used only to ask "does this
// user token still work?", never for its payload.
const TOKEN_PROBE_PATH = "/v1/me/storefront";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Apple Music",
  providerId: "apple-music",
  description: "Connect your Apple Music account",
});

function debugLog(message: string): void {
  if (environment.isDevelopment) console.debug(`[AppleMusicAuth] ${message}`);
}

/** Caches derived from the signed-in account (storefront, /v1/me responses)
 * must not outlive the token they were built under — the next sign-in may be
 * a different account, or the same account in a different storefront. Modules
 * owning such a cache register a clearer here; all clearers run whenever the
 * stored tokens are discarded (sign-out, expiry, revocation). */
type AccountCacheClearer = () => void | Promise<void>;
const accountCacheClearers: AccountCacheClearer[] = [];

export function registerAccountCacheClearer(clear: AccountCacheClearer): void {
  accountCacheClearers.push(clear);
}

async function discardTokens(): Promise<void> {
  await client.removeTokens();
  for (const clear of accountCacheClearers) await clear();
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch(`${PROXY_BASE_URL}/token`, { method: "POST", body: params });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  // Observed fields: access_token, token_type, expires_in, developer_token.
  // `expires_in` being present is what makes the `isExpired()` check in
  // `authorize` meaningful rather than permanently false.
  return (await response.json()) as OAuth.TokenResponse;
}

/** Obtain a Music user token, opening the sign-in flow only when needed.
 *
 * Music user tokens cannot be refreshed — Apple issues no refresh token, and
 * re-running the authorization flow is the only renewal path — so an expired
 * set is discarded and the flow starts over. */
async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (!tokenSet.isExpired()) return tokenSet.accessToken;
    debugLog("stored user token reported expired; discarding and re-authorizing");
    await discardTokens();
  }

  const authRequest = await client.authorizationRequest({
    endpoint: `${PROXY_BASE_URL}/authorize`,
    clientId: CLIENT_ID,
    scope: "",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await fetchTokens(authRequest, authorizationCode);
  await client.setTokens(tokens);
  return tokens.access_token;
}

/** Ask Apple whether a user token is still accepted.
 *
 * A token can be invalidated server-side — signed out on another device, Apple
 * ID password change, lapsed subscription — and nothing about that is visible
 * locally: it is not a JWT, `isExpired()` still reports false, and the stored
 * copy looks perfectly healthy. The only way to know is to ask.
 *
 * A network failure is NOT a rejected token, and must not be reported as one:
 * forcing a sign-in prompt because the user's wifi dropped would be worse than
 * the problem being solved. */
async function isTokenAccepted(userToken: string): Promise<boolean> {
  try {
    const response = await appleMusicRequest(TOKEN_PROBE_PATH, userToken);
    return response.status !== 401 && response.status !== 403;
  } catch (error) {
    debugLog(`token probe could not reach Apple, assuming the token is fine: ${error}`);
    return true;
  }
}

/** `authorize` plus a liveness check on the token it returned.
 *
 * Costs one extra request per command launch and buys the failure mode
 * `authorize` structurally cannot catch: a revoked token sails through its
 * expiry check, so without this a command would open, look healthy, and then
 * fail on real work with no route to recovery but a manual sign-out. */
async function authorizeAndValidate(): Promise<string> {
  const storedBefore = (await client.getTokens())?.accessToken;
  const token = await authorize();
  // A token Apple just minted needs no liveness check — only a token that was
  // already sitting in storage can have been revoked behind our back.
  if (token !== storedBefore) return token;
  if (await isTokenAccepted(token)) return token;

  debugLog("Apple rejected the stored user token; clearing it and signing in again");
  await discardTokens();
  return authorize();
}

/** Wraps a command so the sign-in flow runs before the command body does —
 * commands get a valid token or Raycast's own sign-in screen, and never have
 * to guard individual call sites. Works for both view components and no-view
 * async functions. */
export const withAppleMusicAuth = withAccessToken({ authorize: authorizeAndValidate, client });

/** Drop the stored user token. The next authenticated command prompts for a
 * fresh sign-in, which is also how you switch accounts. */
export async function signOut(): Promise<void> {
  await discardTokens();
}

/** Sign-out affordance for the action panel of any authenticated command.
 * Lives here rather than in a command of its own — signing out is rare
 * enough that it doesn't warrant a slot in the root command list. */
export function SignOutAction() {
  return (
    <Action
      title="Sign out of Apple Music"
      icon={Icon.Logout}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
      onAction={async () => {
        await signOut();
        await showToast({
          style: Toast.Style.Success,
          title: "Signed Out",
          message: "Reopen this command to sign in again.",
        });
      }}
    />
  );
}

type CachedDeveloperToken = { token: string; expiresAtMs: number };

/** The proxy's developer token, cached until it nears expiry.
 *
 * The token is app-level rather than user-level (the endpoint needs no auth at
 * all) and the proxy hands back a byte-identical string on repeated calls, so
 * re-requesting it per API call is pure latency — ~140ms each, which a paging
 * scan pays once per page. Cached in LocalStorage so it survives across
 * command launches too. */
async function getDeveloperToken(): Promise<string> {
  const cachedRaw = await LocalStorage.getItem<string>(DEVELOPER_TOKEN_KEY);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as CachedDeveloperToken;
      if (cached.token && cached.expiresAtMs - DEVELOPER_TOKEN_SKEW_MS > Date.now()) return cached.token;
    } catch {
      // Unparseable entry — fall through and refetch.
    }
  }

  const response = await fetch(`${PROXY_BASE_URL}/developer-token`);
  if (!response.ok) {
    console.error("fetch developer token error:", await response.text());
    throw new Error(response.statusText);
  }
  const { developer_token: developerToken, expires_at: expiresAtSeconds } = (await response.json()) as {
    developer_token: string;
    expires_at?: number;
  };

  // `expires_at` is UNIX SECONDS; Date.now() is milliseconds. Comparing them
  // directly would make every cached token look long expired, silently turning
  // the cache back into a fetch-per-call. If the field ever goes missing,
  // skip caching rather than invent a lifetime.
  if (developerToken && typeof expiresAtSeconds === "number") {
    const entry: CachedDeveloperToken = { token: developerToken, expiresAtMs: expiresAtSeconds * 1000 };
    await LocalStorage.setItem(DEVELOPER_TOKEN_KEY, JSON.stringify(entry));
  } else {
    debugLog("/developer-token returned no expires_at; not caching");
  }
  return developerToken;
}

/** One authenticated call to api.music.apple.com with an explicit user token. */
async function appleMusicRequest(path: string, userToken: string, init?: RequestInit): Promise<Response> {
  const developerToken = await getDeveloperToken();
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${developerToken}`,
      "Music-User-Token": userToken,
    },
  });
}

/** Authenticated request against api.music.apple.com. `path` is everything
 * after the host, e.g. `/v1/me/library/albums?limit=100`. */
export async function appleMusicFetch(path: string, init?: RequestInit): Promise<Response> {
  return appleMusicRequest(path, (await client.getTokens())?.accessToken ?? "", init);
}
