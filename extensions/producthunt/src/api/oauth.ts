// Product Hunt OAuth (PKCE) — "Sign in with Product Hunt".
//
// Product Hunt's API moved to per-user OAuth: the extension is registered as a
// PUBLIC client (no secret) and uses the Authorization Code + PKCE flow. One
// signed-in token unlocks BOTH public data (posts, topics) and the user's own
// personal data (viewer.user). The old API Key/Secret client-credentials path is
// retired — a public client cannot use that grant.
//
// The client_id below is PUBLIC by design (that is the whole point of a public
// OAuth client); it is safe to ship in a distributed extension.
import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { failureToast } from "../util/toast";

// Public OAuth client_id for the Product Hunt "Raycast" application.
const PH_CLIENT_ID = "RQV80HZUDjsdGb8WmI73SH1Wl7bfyvDNgVROiwQUu0U";

const AUTHORIZE_URL = "https://api.producthunt.com/v2/oauth/authorize";
const TOKEN_URL = "https://api.producthunt.com/v2/oauth/token";

// `public` unlocks all read queries; `private` adds the signed-in user's
// viewer.user personal data (upvotes/submissions/etc.).
const SCOPE = "public private";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web, // https://raycast.com/redirect?packageName=Extension
  providerName: "Product Hunt",
  providerIcon: "icon.png",
  description: "Sign in to Product Hunt to see votes, comments, makers, and your own upvotes.",
});

/**
 * The Product Hunt OAuth provider. Wrap a command's default export in
 * `withAccessToken(productHuntOAuth)` to gate it on sign-in, or use the helpers
 * below to check/read the token without forcing a login (so signed-out users can
 * still get the public feed).
 */
export const productHuntOAuth = new OAuthService({
  client,
  clientId: PH_CLIENT_ID,
  scope: SCOPE,
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  // No client_secret — public client, secret-less PKCE.
});

/**
 * Return the stored access token if the user is already signed in, else null.
 * Does NOT trigger the login flow — safe to call from the feed/public path.
 * PH tokens are long-lived (no expiry/refresh), so a stored token is usable.
 */
export async function getStoredAccessToken(): Promise<string | null> {
  const tokenSet = await client.getTokens();
  return tokenSet?.accessToken ?? null;
}

/** True if the user has completed the Product Hunt sign-in. */
export async function isSignedIn(): Promise<boolean> {
  return (await getStoredAccessToken()) !== null;
}

/** Start the interactive sign-in flow and return the fresh access token. */
export async function signIn(): Promise<string> {
  await productHuntOAuth.authorize();
  const token = await getStoredAccessToken();
  if (!token) throw new Error("Sign-in completed but no access token was stored.");
  return token;
}

/**
 * Recovery path for a REJECTED/stale token. `authorize()` returns the existing
 * stored token without re-opening the browser, so it cannot recover a bad token.
 * Remove the tokens first, then run the interactive flow to get a fresh one.
 */
export async function reauthorize(): Promise<string> {
  await client.removeTokens();
  await productHuntOAuth.authorize();
  const token = await getStoredAccessToken();
  if (!token) throw new Error("Re-authorization completed but no access token was stored.");
  return token;
}

/** Clear the stored tokens (sign out). */
export async function signOut(): Promise<void> {
  await client.removeTokens();
}

/**
 * Failure toast for auth actions (sign in / out / reauthorize). Thin semantic
 * wrapper over the shared `failureToast` so every auth failure offers "Copy Error".
 */
export async function authErrorToast(title: string, error: unknown): Promise<void> {
  await failureToast(title, error);
}
