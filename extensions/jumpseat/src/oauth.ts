import { createHash, randomUUID } from "node:crypto";
import { LocalStorage, OAuth } from "@raycast/api";
import { getJumpseatConfiguration } from "./config";
import {
  jumpseatConfigurationId,
  type JumpseatConfiguration,
} from "./config-values";
import { REQUEST_TIMEOUT_MS, responseErrorMessage } from "./http";
import {
  parseOAuthTokenResponse,
  parseRefreshResponse,
} from "./oauth-response";

const CLIENT_ID = "jumpseat-raycast";
const SCOPE = "flights:upcoming:read";
const INSTALL_ID_KEY = "jumpseat-client-install-id";
const AUTH_CONFIGURATION_KEY = "jumpseat-auth-configuration";

export const jumpseatOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Jumpseat",
  providerIcon: "extension-icon.png",
  description: "Connect your Jumpseat account to see your upcoming flights.",
});

export class JumpseatAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JumpseatAuthenticationError";
  }
}

async function exchangeAuthorizationCode(
  apiBaseUrl: string,
  request: OAuth.AuthorizationRequest,
  authorizationCode: string,
): Promise<OAuth.TokenResponse> {
  const response = await fetch(
    new URL("/api/v1/auth/oauth/token", apiBaseUrl),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: authorizationCode,
        client_id: CLIENT_ID,
        redirect_uri: request.redirectURI,
        code_verifier: request.codeVerifier,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new JumpseatAuthenticationError(
      await responseErrorMessage(
        response,
        "Jumpseat could not complete sign-in.",
      ),
    );
  }

  const tokens = parseOAuthTokenResponse(await response.json());
  if (!tokens || tokens.scope !== SCOPE) {
    throw new JumpseatAuthenticationError(
      "Jumpseat returned an unexpected sign-in response.",
    );
  }
  return tokens;
}

async function authorize(
  configuration: JumpseatConfiguration,
): Promise<string> {
  const request = await jumpseatOAuthClient.authorizationRequest({
    endpoint: new URL("/connect/raycast", configuration.webBaseUrl).toString(),
    clientId: CLIENT_ID,
    scope: SCOPE,
  });
  const { authorizationCode } = await jumpseatOAuthClient.authorize(request);
  const tokens = await exchangeAuthorizationCode(
    configuration.apiBaseUrl,
    request,
    authorizationCode,
  );
  await jumpseatOAuthClient.setTokens(tokens);
  await LocalStorage.setItem(
    AUTH_CONFIGURATION_KEY,
    jumpseatConfigurationId(configuration),
  );
  return tokens.access_token;
}

async function clearStoredAuthorization(): Promise<void> {
  await Promise.all([
    jumpseatOAuthClient.removeTokens(),
    LocalStorage.removeItem(AUTH_CONFIGURATION_KEY),
  ]);
}

async function getTokensForCurrentConfiguration(
  configuration: JumpseatConfiguration,
): Promise<OAuth.TokenSet | undefined> {
  const tokens = await jumpseatOAuthClient.getTokens();
  if (!tokens) return undefined;

  const storedConfigurationId = await LocalStorage.getItem<string>(
    AUTH_CONFIGURATION_KEY,
  );
  const currentConfigurationId = jumpseatConfigurationId(configuration);
  if (storedConfigurationId !== currentConfigurationId) {
    await clearStoredAuthorization();
    return undefined;
  }
  return tokens;
}

async function getClientInstallId(): Promise<string> {
  const existing = await LocalStorage.getItem<string>(INSTALL_ID_KEY);
  if (existing) return existing;
  const created = randomUUID();
  await LocalStorage.setItem(INSTALL_ID_KEY, created);
  return created;
}

function getRefreshRequestId(
  refreshToken: string,
  clientInstallId: string,
): string {
  return createHash("sha256")
    .update(`${clientInstallId}:${refreshToken}:jumpseat-raycast-refresh-v1`)
    .digest("hex");
}

async function refreshStoredAccessToken(
  configuration: JumpseatConfiguration,
  tokens: OAuth.TokenSet | undefined,
): Promise<string> {
  if (!tokens?.refreshToken) {
    await clearStoredAuthorization();
    throw new JumpseatAuthenticationError(
      "Your Jumpseat session has expired. Try again to sign in.",
    );
  }

  const clientInstallId = await getClientInstallId();
  const response = await fetch(
    new URL("/api/v1/auth/refresh", configuration.apiBaseUrl),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Jumpseat-Client": "raycast",
        "X-Auth-Refresh-Reason": "proactive_request",
        "X-Auth-Refresh-Id": getRefreshRequestId(
          tokens.refreshToken,
          clientInstallId,
        ),
        "X-Client-Install-Id": clientInstallId,
      },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    await clearStoredAuthorization();
    throw new JumpseatAuthenticationError(
      await responseErrorMessage(
        response,
        "Your Jumpseat session has expired. Try again to sign in.",
      ),
    );
  }

  const refreshed = parseRefreshResponse(await response.json());
  if (!refreshed) {
    await clearStoredAuthorization();
    throw new JumpseatAuthenticationError(
      "Jumpseat returned an unexpected refresh response.",
    );
  }

  await jumpseatOAuthClient.setTokens({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresIn: refreshed.expiresIn,
    scope: SCOPE,
  });
  return refreshed.accessToken;
}

export async function refreshJumpseatAccessToken(
  configuration = getJumpseatConfiguration(),
): Promise<string> {
  return refreshStoredAccessToken(
    configuration,
    await getTokensForCurrentConfiguration(configuration),
  );
}

export async function getJumpseatAccessToken(
  configuration = getJumpseatConfiguration(),
): Promise<string> {
  const tokens = await getTokensForCurrentConfiguration(configuration);
  if (!tokens?.accessToken) return authorize(configuration);
  if (tokens.isExpired())
    return refreshStoredAccessToken(configuration, tokens);
  return tokens.accessToken;
}

export async function clearJumpseatAuthorization(): Promise<void> {
  await clearStoredAuthorization();
}
