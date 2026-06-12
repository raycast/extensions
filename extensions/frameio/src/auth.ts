import { LocalStorage, OAuth, showToast, Toast } from "@raycast/api";
import { debug } from "./debug";
import { loadClientId, STORAGE_KEY_CLIENT_ID } from "./client-id";

const ADOBE_IMS_BASE = "https://ims-na1.adobelogin.com/ims";
const SCOPES = "openid email profile offline_access additional_info.roles";

let _client: OAuth.PKCEClient | null = null;
let _authorizeInFlight: Promise<void> | null = null;
let _refreshInFlight: Promise<string> | null = null;

function getClient(): OAuth.PKCEClient {
  if (!_client) {
    _client = new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.Web,
      providerName: "Frame.io",
      providerIcon: "icons/extension-icon.png",
      providerId: "frameio-adobe-ims",
      description: "Connect your Frame.io account via Adobe IMS",
    });
  }
  return _client;
}

export async function authorize(): Promise<void> {
  if (_authorizeInFlight) {
    return _authorizeInFlight;
  }

  _authorizeInFlight = authorizeInternal().finally(() => {
    _authorizeInFlight = null;
  });

  return _authorizeInFlight;
}

async function authorizeInternal(): Promise<void> {
  const client = getClient();
  const clientId = await loadClientId();

  if (!clientId) {
    throw new Error("Client ID missing. Enter it in the setup screen.");
  }

  const tokenSet = await client.getTokens();

  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      const refreshed = await refreshAccessToken(tokenSet.refreshToken, clientId);
      await client.setTokens(refreshed);
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: `${ADOBE_IMS_BASE}/authorize/v2`,
    clientId,
    scope: SCOPES,
    extraParameters: {
      response_type: "code",
    },
  });

  try {
    const { authorizationCode } = await client.authorize(authRequest);
    const tokens = await exchangeCodeForTokens(authRequest, authorizationCode, clientId);
    await client.setTokens(tokens);
  } catch (error) {
    const message = String(error);
    debug.error("OAuth failed", message);
    await showToast({
      style: Toast.Style.Failure,
      title: "Adobe Sign-In Failed",
      message:
        "Make sure your Adobe credential is a Single Page App and that the Redirect URI exactly matches the one shown in the terminal logs.",
    });
    throw error;
  }
}

async function exchangeCodeForTokens(
  authRequest: OAuth.AuthorizationRequest,
  code: string,
  clientId: string
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", clientId);
  params.append("code", code);
  params.append("redirect_uri", authRequest.redirectURI);
  params.append("code_verifier", authRequest.codeVerifier);

  // Adobe exige client_id en query string pour les credentials SPA / Native (public clients)
  const response = await fetch(`${ADOBE_IMS_BASE}/token/v3?client_id=${encodeURIComponent(clientId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    debug.error("Token exchange failed", error);
    throw new Error(`Token exchange failed: ${error}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshAccessToken(refreshToken: string, clientId: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);

  const response = await fetch(`${ADOBE_IMS_BASE}/token/v3?client_id=${encodeURIComponent(clientId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

export async function getAccessToken(): Promise<string> {
  const client = getClient();

  const tokenSet = await client.getTokens();
  if (!tokenSet?.accessToken) {
    throw new Error("Not authenticated. Please run the command again to log in.");
  }

  if (tokenSet.refreshToken && tokenSet.isExpired()) {
    if (!_refreshInFlight) {
      const clientId = await loadClientId();
      _refreshInFlight = refreshAccessToken(tokenSet.refreshToken, clientId)
        .then(async (refreshed) => {
          await client.setTokens(refreshed);
          return refreshed.access_token;
        })
        .finally(() => {
          _refreshInFlight = null;
        });
    }
    return _refreshInFlight;
  }

  return tokenSet.accessToken;
}

export async function logout(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY_CLIENT_ID);
  // Tokens are intentionally kept: removing them while the command is active
  // triggers Raycast's OAuth overlay automatically. They will expire on their own.
  // If the user re-enters the same client ID, still-valid tokens avoid a redundant re-auth.
}
