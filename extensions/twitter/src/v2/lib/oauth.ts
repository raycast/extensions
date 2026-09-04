import { LocalStorage, OAuth } from "@raycast/api";
import { XIcon } from "../../icon";

const CLIENT_ID = "eHhMN2wwUldTeEpscThvMzBHZVI6MTpjaQ";
const OAUTH_MIGRATION_KEY = "oauth-client-migration";
const AUTHORIZATION_ENDPOINT = "https://x.com/i/oauth2/authorize";
const TOKEN_ENDPOINT = "https://api.x.com/2/oauth2/token";
const OAUTH_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "follows.read",
  "like.write",
  "bookmark.read",
  "bookmark.write",
  "tweet.moderate.write",
  "media.write",
  "dm.read",
  "dm.write",
  "offline.access",
].join(" ");
const OAUTH_CONFIGURATION = `${CLIENT_ID}:${OAUTH_SCOPES}`;

interface OAuthErrorPayload {
  error?: string;
  error_description?: string;
  title?: string;
  detail?: string;
}

class OAuthRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly errorCode?: string,
  ) {
    super(message);
    this.name = "OAuthRequestError";
  }
}

export function getClientId(): string {
  return CLIENT_ID;
}

const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "X",
  providerIcon: XIcon(),
  providerId: "twitter",
  description: "Connect your X account",
});

// Authorization

let migrationPromise: Promise<void> | undefined;

async function migrateOAuthClient(): Promise<void> {
  const migratedConfiguration = await LocalStorage.getItem<string>(OAUTH_MIGRATION_KEY);
  if (migratedConfiguration === OAUTH_CONFIGURATION) {
    return;
  }

  await oauthClient.removeTokens();
  await LocalStorage.setItem(OAUTH_MIGRATION_KEY, OAUTH_CONFIGURATION);
}

async function ensureOAuthClientMigration(): Promise<void> {
  migrationPromise ??= migrateOAuthClient();
  await migrationPromise;
}

export async function authorize(): Promise<void> {
  await ensureOAuthClientMigration();
  const tokenSet = await oauthClient.getTokens();
  if (tokenSet?.accessToken) {
    if (!tokenSet.isExpired()) {
      return;
    }

    if (tokenSet.refreshToken) {
      try {
        await oauthClient.setTokens(await refreshTokens(tokenSet.refreshToken));
        return;
      } catch (error) {
        if (!isInvalidGrantError(error)) throw error;
      }
    }

    await oauthClient.removeTokens();
  }

  const authRequest = await oauthClient.authorizationRequest({
    endpoint: AUTHORIZATION_ENDPOINT,
    clientId: getClientId(),
    scope: OAUTH_SCOPES,
  });
  const { authorizationCode } = await oauthClient.authorize(authRequest);
  await oauthClient.setTokens(await fetchTokens(authRequest, authorizationCode));
}

export async function fetchTokens(
  authRequest: OAuth.AuthorizationRequest,
  authCode: string,
): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", getClientId());
  params.append("code", authCode);
  params.append("code_verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  return await requestTokens(params);
}

export async function getOAuthTokens(): Promise<OAuth.TokenSet | undefined> {
  return await oauthClient.getTokens();
}

export async function resetOAuthTokens(): Promise<void> {
  await oauthClient.removeTokens();
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", getClientId());
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const tokenResponse = await requestTokens(params);
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

async function requestTokens(params: URLSearchParams): Promise<OAuth.TokenResponse> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const responseBody = await response.text();
  let payload: OAuthErrorPayload | OAuth.TokenResponse | undefined;
  try {
    payload = JSON.parse(responseBody) as OAuthErrorPayload | OAuth.TokenResponse;
  } catch {
    // The status and raw response below still provide a useful error.
  }

  if (!response.ok) {
    const errorPayload = payload as OAuthErrorPayload | undefined;
    const rawMessage = responseBody.trim();
    const message =
      errorPayload?.error_description ??
      errorPayload?.detail ??
      errorPayload?.title ??
      errorPayload?.error ??
      (rawMessage || `X OAuth request failed with status ${response.status}`);
    throw new OAuthRequestError(message, response.status, errorPayload?.error);
  }

  const tokenResponse = payload as OAuth.TokenResponse | undefined;
  if (!tokenResponse?.access_token) {
    throw new OAuthRequestError("X returned an invalid OAuth token response", response.status);
  }
  return tokenResponse;
}

function isInvalidGrantError(error: unknown): boolean {
  return error instanceof OAuthRequestError && ["invalid_grant", "invalid_token"].includes(error.errorCode ?? "");
}
