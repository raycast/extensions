import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";

interface Preferences {
  serverUrl: string;
}

export function getServerUrl(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  return serverUrl.replace(/\/+$/, "");
}

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "TaskTickr",
  providerIcon: "icon.png",
  description: "Sign in to your TaskTickr instance",
});

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

function clientIdStorageKey(serverUrl: string): string {
  return `oauth-client-id:${serverUrl}`;
}

/** Dynamic client registration (RFC 7591), cached per server URL. */
async function getClientId(serverUrl: string): Promise<string> {
  const cached = await LocalStorage.getItem<string>(
    clientIdStorageKey(serverUrl),
  );
  if (cached) return cached;

  const res = await fetch(`${serverUrl}/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "TaskTickr Raycast",
      redirect_uris: [
        "https://raycast.com/redirect",
        "https://raycast.com/redirect?packageName=Extension",
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Client registration failed (${res.status}): ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { client_id: string };
  await LocalStorage.setItem(clientIdStorageKey(serverUrl), body.client_id);
  return body.client_id;
}

async function requestTokens(
  serverUrl: string,
  params: Record<string, string>,
): Promise<TokenResponse> {
  const res = await fetch(`${serverUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    throw new Error(
      `Token request failed (${res.status}): ${await res.text()}`,
    );
  }
  return (await res.json()) as TokenResponse;
}

async function fullAuthorize(serverUrl: string): Promise<string> {
  const clientId = await getClientId(serverUrl);
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: `${serverUrl}/authorize`,
    clientId,
    scope: "tasks",
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  const tokens = await requestTokens(serverUrl, {
    grant_type: "authorization_code",
    code: authorizationCode,
    code_verifier: authRequest.codeVerifier,
    client_id: clientId,
    redirect_uri: authRequest.redirectURI,
  });
  await oauthClient.setTokens(tokens);
  return tokens.access_token;
}

/**
 * Returns a valid access token: cached if fresh, refreshed via rotating
 * refresh token if expired, full browser authorization otherwise.
 */
export async function getAccessToken(): Promise<string> {
  const serverUrl = getServerUrl();
  const tokenSet = await oauthClient.getTokens();

  if (tokenSet?.accessToken) {
    if (!tokenSet.isExpired()) return tokenSet.accessToken;
    if (tokenSet.refreshToken) {
      try {
        const clientId = await getClientId(serverUrl);
        const tokens = await requestTokens(serverUrl, {
          grant_type: "refresh_token",
          refresh_token: tokenSet.refreshToken,
          client_id: clientId,
        });
        await oauthClient.setTokens(tokens);
        return tokens.access_token;
      } catch {
        // Rotated refresh token rejected (revoked or >90d old) — re-authorize.
      }
    }
  }

  return fullAuthorize(serverUrl);
}

/** Drop tokens (and re-auth on next call). Used on 401 and for manual sign-out. */
export async function clearTokens(): Promise<void> {
  await oauthClient.removeTokens();
}
