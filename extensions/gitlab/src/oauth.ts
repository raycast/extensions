import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
import { getHttpAgent } from "./gitlabapi";
import { getInstance, getPrefs, OAUTH_SCOPES, requireOAuthClientId } from "./preferences";

// We don't use `@raycast/utils`'s `OAuthService`: it has no hook for injecting
// an `https.Agent`, which the `customcacert`, `customcert`, and `ignorecerts`
// preferences require for self-hosted instances. Driving PKCE manually keeps
// every request, including the token endpoint, behind `getHttpAgent()`.
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "GitLab",
  providerIcon: "gitlab.png",
  providerId: "gitlab",
  description: "Connect your GitLab account to Raycast.",
});

// Single-flight slots. Coalesce parallel 401-driven refreshes (GitLab rotates
// the refresh token, so two concurrent uses race) and parallel cold starts
// (so we never open two browser tabs).
let inflightRefresh: Promise<string | undefined> | null = null;
let inflightAuthorizationFlow: Promise<string> | null = null;

/**
 * Return a valid access token. Runs the PKCE flow on first use, refreshes
 * silently on expiry, and re-runs the full flow if refresh fails.
 */
export async function authorize(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (!tokenSet.isExpired()) return tokenSet.accessToken;
    if (tokenSet.refreshToken) {
      const refreshed = await tryRefresh();
      if (refreshed) return refreshed;
    }
  }
  return runAuthorizationFlow();
}

/**
 * Force-refresh and return a fresh access token. Used by the 401 auto-retry
 * path when the cached token has been rejected mid-request.
 */
export async function refreshToken(): Promise<string> {
  const refreshed = await tryRefresh();
  if (refreshed) return refreshed;
  return runAuthorizationFlow();
}

/** Clear the stored token set, e.g. to switch accounts. */
export async function logout(): Promise<void> {
  await client.removeTokens();
}

function tryRefresh(): Promise<string | undefined> {
  if (inflightRefresh) return inflightRefresh;
  inflightRefresh = (async () => {
    try {
      // Re-read inside the lock: a concurrent refresh may have just stored a
      // new refresh token, so anything captured outside would be stale.
      const tokenSet = await client.getTokens();
      if (!tokenSet?.refreshToken) return undefined;
      const tokens = await postToken(
        new URLSearchParams({
          client_id: requireOAuthClientId(),
          refresh_token: tokenSet.refreshToken,
          grant_type: "refresh_token",
        }),
        "Token refresh",
      );
      await client.setTokens(tokens);
      return tokens.access_token;
    } catch {
      // Refresh rejected (revoked or aged out). Drop tokens; caller restarts
      // the full authorization flow.
      await client.removeTokens();
      return undefined;
    } finally {
      inflightRefresh = null;
    }
  })();
  return inflightRefresh;
}

function runAuthorizationFlow(): Promise<string> {
  if (inflightAuthorizationFlow) return inflightAuthorizationFlow;
  inflightAuthorizationFlow = (async () => {
    try {
      const prefs = getPrefs();
      const clientId = requireOAuthClientId(prefs);
      const authRequest = await client.authorizationRequest({
        endpoint: `${getInstance(prefs)}/oauth/authorize`,
        clientId,
        scope: OAUTH_SCOPES.join(" "),
      });
      const { authorizationCode } = await client.authorize(authRequest);
      const tokens = await postToken(
        new URLSearchParams({
          client_id: clientId,
          code: authorizationCode,
          code_verifier: authRequest.codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: authRequest.redirectURI,
        }),
        "Token exchange",
      );
      await client.setTokens(tokens);
      return tokens.access_token;
    } finally {
      inflightAuthorizationFlow = null;
    }
  })();
  return inflightAuthorizationFlow;
}

async function postToken(params: URLSearchParams, context: string): Promise<OAuth.TokenResponse> {
  const response = await fetch(`${getInstance()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    agent: getHttpAgent(),
  });
  if (!response.ok) {
    throw new Error(`${context} failed: ${response.status} ${await response.text()}`);
  }
  return (await response.json()) as OAuth.TokenResponse;
}
