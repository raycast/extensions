// Sign-in. An API key from the extension's preferences wins; without one, Raycast signs in to
// fpy.sh with OAuth (PKCE). fpy.sh accepts Raycast's hosted Client ID Metadata Document, so there is
// nothing to register. The access token is an ordinary account-wide Floppy API key that lives until
// it's disconnected (fpy.sh/app/keys, or Raycast's logout, which revokes it).
import { OAuth, getPreferenceValues } from "@raycast/api";
import { BASE_URL } from "./config";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.ClientIdMetadataDocument,
  providerName: "Floppy",
  providerIcon: "floppy.png",
  providerId: "floppy",
  description: "Sign in to Floppy to search your disk, share files and see who read them.",
  revocationEndpoint: `${BASE_URL}/oauth/revoke`,
});

type TokenResponse = { access_token?: string; refresh_token?: string; error_description?: string; error?: string };

let signingIn: Promise<string> | null = null;

/** The OAuth access token, signing in first if there is none. One sign-in at a time. */
export function authorize(): Promise<string> {
  signingIn ??= signIn().finally(() => {
    signingIn = null;
  });
  return signingIn;
}

async function signIn(): Promise<string> {
  const saved = await oauthClient.getTokens();
  if (saved?.accessToken) return saved.accessToken;

  const request = await oauthClient.authorizationRequest({
    endpoint: `${BASE_URL}/oauth/authorize`,
    scope: "",
    extraParameters: { resource: `${BASE_URL}/mcp` },
  });
  const { authorizationCode } = await oauthClient.authorize(request);

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: request.redirectURI,
      client_id: request.clientId,
      code_verifier: request.codeVerifier,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !body.access_token)
    throw new Error(body.error_description || body.error || "Couldn't sign in to Floppy");
  await oauthClient.setTokens({ accessToken: body.access_token, refreshToken: body.refresh_token });
  return body.access_token;
}

/** The API key from the preferences, if the user set one. */
export function apiKeyPreference(): string | undefined {
  const { apiKey } = getPreferenceValues<{ apiKey?: string }>();
  const key = apiKey?.trim();
  return key ? key : undefined;
}

/** The token for API calls: the API key if there is one, else the OAuth access token. */
export async function accessToken(): Promise<string> {
  return apiKeyPreference() ?? (await authorize());
}

/** Forget a token fpy.sh refused (revoked on fpy.sh/app/keys), so the next call signs in again. */
export async function forgetToken() {
  if (!apiKeyPreference()) await oauthClient.removeTokens();
}
