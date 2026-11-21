import { getPreferenceValues, OAuth } from "@raycast/api";

/**
 * Savee registers OAuth apps by invite. Once the Raycast app exists, put its public client id here
 * and people can sign in with Savee instead of pasting a personal access token.
 */
export const SAVEE_OAUTH_CLIENT_ID = "";

const AUTHORIZE_URL = "https://savee.com/oauth/authorize/";
const TOKEN_URL = "https://savee.com/api/oauth/token/";
const API_RESOURCE = "https://api.savee.com";
const SCOPES = "profile:read saves:read boards:read search:read";

export class MissingTokenError extends Error {
  constructor() {
    super("Add your Savee personal access token in the extension preferences");
    this.name = "MissingTokenError";
  }
}

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Savee",
  providerIcon: "extension-icon.png",
  providerId: "savee",
  description: "Connect your Savee account to browse your saves and boards",
});

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

function getPersonalAccessToken(): string | undefined {
  const { personalAccessToken } = getPreferenceValues<ExtensionPreferences>();
  const token = personalAccessToken?.trim();
  return token ? token : undefined;
}

export function usesPersonalAccessToken(): boolean {
  return Boolean(getPersonalAccessToken()) || !SAVEE_OAUTH_CLIENT_ID;
}

async function requestTokens(body: Record<string, string>): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ...body, client_id: SAVEE_OAUTH_CLIENT_ID, resource: API_RESOURCE }),
  });

  if (!response.ok) {
    throw new Error("Savee sign-in failed (" + response.status + ")");
  }

  return (await response.json()) as TokenResponse;
}

async function authorize(): Promise<string> {
  const request = await client.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId: SAVEE_OAUTH_CLIENT_ID,
    scope: SCOPES,
    extraParameters: { resource: API_RESOURCE },
  });
  const { authorizationCode } = await client.authorize(request);
  const tokens = await requestTokens({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: request.redirectURI,
    code_verifier: request.codeVerifier,
  });
  await client.setTokens(tokens);
  return tokens.access_token;
}

export async function getAccessToken(): Promise<string> {
  const personalAccessToken = getPersonalAccessToken();
  if (personalAccessToken) {
    return personalAccessToken;
  }

  if (!SAVEE_OAUTH_CLIENT_ID) {
    throw new MissingTokenError();
  }

  const stored = await client.getTokens();
  if (stored?.accessToken && !stored.isExpired()) {
    return stored.accessToken;
  }

  if (stored?.refreshToken) {
    try {
      const tokens = await requestTokens({ grant_type: "refresh_token", refresh_token: stored.refreshToken });
      await client.setTokens({ ...tokens, refresh_token: tokens.refresh_token ?? stored.refreshToken });
      return tokens.access_token;
    } catch {
      await client.removeTokens();
    }
  }

  return authorize();
}

/** Forget an OAuth session Savee no longer accepts, so the next request signs in again. */
export async function resetOAuthSession(): Promise<void> {
  if (!getPersonalAccessToken() && SAVEE_OAUTH_CLIENT_ID) {
    await client.removeTokens();
  }
}
