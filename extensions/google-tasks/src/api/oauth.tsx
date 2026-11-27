import {
  environment,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  LocalStorage,
  OAuth,
  popToRoot,
} from "@raycast/api";
import { setTimeout as delay } from "node:timers/promises";

export type AuthorizationErrorDetails = {
  message: string;
  needsPreferences: boolean;
};

class OAuthConfigurationError extends Error {}

function createClient(): OAuth.PKCEClient {
  return new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.AppURI,
    providerName: "Google",
    providerIcon: "google-logo.png",
    providerId: "google",
    description: "Sign in once to access your Google Tasks",
  });
}

// Keep token storage shared, but give every authorization attempt fresh native state.
export const client = createClient();

// Authorization

const clientIdKey = "google-client-id";
const clientIdPattern = /^[\w-]+\.apps\.googleusercontent\.com$/;

export function isValidClientId(value: string): boolean {
  return clientIdPattern.test(value.trim());
}

export function hasPreferenceClientId(): boolean {
  return !!getPreferenceValues().clientId?.trim();
}

export async function saveClientId(value: string): Promise<void> {
  await LocalStorage.setItem(clientIdKey, value.trim());
  await client.removeTokens();
}

async function getClientId(): Promise<string> {
  const clientId =
    getPreferenceValues().clientId?.trim() || ((await LocalStorage.getItem<string>(clientIdKey)) ?? "").trim();
  if (!clientId) {
    throw new OAuthConfigurationError("Add a Google OAuth Client ID to connect your account.");
  }
  if (!isValidClientId(clientId)) {
    throw new OAuthConfigurationError(
      "The saved Client ID is not valid. It should end in `.apps.googleusercontent.com` and is not an API key or client secret.",
    );
  }
  return clientId;
}

export async function authorize(): Promise<boolean> {
  const clientId = await getClientId();
  const authClient = createClient();
  const tokenSet = await authClient.getTokens();
  if (tokenSet?.accessToken) {
    if (!tokenSet.isExpired()) return false;
    if (tokenSet.refreshToken) {
      await authClient.setTokens(await refreshTokens(clientId, tokenSet.refreshToken));
      return false;
    }
    await authClient.removeTokens();
  }

  const authRequest = await authClient.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId,
    scope: "https://www.googleapis.com/auth/tasks",
    extraParameters: {
      access_type: "offline",
      prompt: "consent",
    },
  });
  const { authorizationCode } = await authClient.authorize(authRequest);
  await authClient.setTokens(await fetchTokens(clientId, authRequest, authorizationCode));
  return true;
}

export async function reconnect(): Promise<boolean> {
  await client.removeTokens();
  return authorize();
}

export async function dismissAuthorizationOverlay(): Promise<void> {
  const command = environment.entryPointName || environment.commandName;
  await delay(1500);

  void launchCommand({
    name: command,
    type: LaunchType.UserInitiated,
  }).catch(() => undefined);
  await delay(300);
  void popToRoot();
}

export function describeAuthorizationError(error: unknown): AuthorizationErrorDetails {
  const message = error instanceof Error ? error.message : String(error);
  return {
    message: message || "Google authorization could not be completed.",
    needsPreferences: error instanceof OAuthConfigurationError,
  };
}

async function fetchTokens(
  clientId: string,
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    code: authCode,
    code_verifier: authRequest.codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: authRequest.redirectURI,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    throw await oauthResponseError(response);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(clientId: string, refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: params,
  });
  if (!response.ok) {
    throw await oauthResponseError(response);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

async function oauthResponseError(response: Response): Promise<Error> {
  const body = await response.text();
  let message = response.statusText;
  try {
    const details = JSON.parse(body) as { error?: string; error_description?: string };
    if (details.error === "invalid_client" || details.error === "unauthorized_client") {
      return new OAuthConfigurationError(
        "Google rejected the Client ID. Check that it belongs to an iOS OAuth client with Bundle ID `com.raycast`.",
      );
    }
    message = details.error_description ?? details.error ?? message;
  } catch {
    // Keep the HTTP status when the provider does not return JSON.
  }
  return new Error(message || "Google rejected the OAuth request.");
}
