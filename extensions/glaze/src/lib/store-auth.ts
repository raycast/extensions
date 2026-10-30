import { OAuth } from "@raycast/api";
import { AUTH_PUBLIC_KEY, AUTH_URL } from "./auth-config";
import { TARGET_APP } from "./paths";

// The extension owns this session. Never read or refresh the desktop app's tokens.
const tokenStore = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: TARGET_APP.name,
  providerId: `${TARGET_APP.bundleId}-store`,
  providerIcon: "extension-icon.png",
});

export class StoreSignInRequired extends Error {
  constructor() {
    super("Sign in to Glaze to browse your team stores.");
  }
}

async function authRequest(route: string, body: object): Promise<Response> {
  return fetch(`${AUTH_URL}/${route}`, {
    method: "POST",
    headers: { apikey: AUTH_PUBLIC_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
}

function authError(response: Response, fallback: string): Error {
  return new Error(
    response.status === 429
      ? "Too many attempts. Please wait before trying again."
      : fallback,
  );
}

async function saveSession(response: Response): Promise<string> {
  const session = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!session.access_token || !session.refresh_token || !session.expires_in) {
    throw new Error(
      "Glaze did not return a complete session. Please sign in again.",
    );
  }
  await tokenStore.setTokens({
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
  });
  return session.access_token;
}

export type StoreSignInProvider = "google" | "apple";

export async function signInToStore(
  provider: StoreSignInProvider,
): Promise<void> {
  tokenStore.description = `Sign in with ${provider === "google" ? "Google" : "Apple"} to access your Glaze team stores.`;
  const request = await tokenStore.authorizationRequest({
    endpoint: `${AUTH_URL}/authorize`,
    // Supabase owns the Google/Apple client configuration. This public app key
    // identifies the service to Raycast; the provider URL below omits client_id.
    clientId: AUTH_PUBLIC_KEY,
    scope: "",
  });
  // Supabase returns its own provider state. Carry Raycast's state on the final
  // redirect so the browser returns to the correct Raycast flavor and request.
  const redirect = new URL(request.redirectURI);
  redirect.searchParams.set("state", request.state);
  const authorizationURL = new URL(`${AUTH_URL}/authorize`);
  authorizationURL.search = new URLSearchParams({
    provider,
    redirect_to: redirect.toString(),
    code_challenge: request.codeChallenge,
    code_challenge_method: "s256",
  }).toString();
  const { authorizationCode } = await tokenStore.authorize({
    url: authorizationURL.toString(),
  });
  const response = await authRequest("token?grant_type=pkce", {
    auth_code: authorizationCode,
    code_verifier: request.codeVerifier,
  });
  if (!response.ok) {
    throw authError(
      response,
      "Glaze could not complete sign-in. Try signing in again.",
    );
  }
  await refreshInFlight?.catch(() => undefined);
  await saveSession(response);
}

let refreshInFlight: Promise<string> | undefined;

export async function getStoreAccessToken(): Promise<string> {
  const session = await tokenStore.getTokens();
  if (!session) throw new StoreSignInRequired();
  if (!session.isExpired()) return session.accessToken;
  if (!session.refreshToken) throw new StoreSignInRequired();
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await authRequest("token?grant_type=refresh_token", {
        refresh_token: session.refreshToken,
      });
      if (!response.ok) {
        if ([400, 401, 403].includes(response.status))
          throw new StoreSignInRequired();
        throw authError(
          response,
          "Glaze sign-in is temporarily unavailable. Try again shortly.",
        );
      }
      return saveSession(response);
    })().finally(() => {
      refreshInFlight = undefined;
    });
  }
  return refreshInFlight;
}

export async function hasStoreSession(): Promise<boolean> {
  return Boolean(await tokenStore.getTokens());
}

export async function disconnectStore(): Promise<void> {
  // Avoid a pending refresh restoring the session after the user disconnects.
  await refreshInFlight?.catch(() => undefined);
  await tokenStore.removeTokens();
}
