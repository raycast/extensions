import { OAuth } from "@raycast/api";
import axios from "axios";
import { PostHogAccount, PostHogRegion, normalizeBaseUrl } from "./account-model";
import { getAccounts, saveAccount } from "./accounts";

const CLIENT_METADATA_PATH = "/api/oauth/raycast/client-metadata";

function getClientId(authBaseUrl: string): string {
  return `${authBaseUrl}${CLIENT_METADATA_PATH}`;
}
const SCOPES = ["openid", "profile", "email", "project:read", "feature_flag:read", "cohort:read", "dashboard:read", "person:read"].join(
  " "
);

type OAuthServerMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  posthog_base_url?: string;
};

type PostHogTokenResponse = OAuth.TokenResponse & {
  token_type?: string;
};

type PostHogUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  preferred_username?: string;
};

export const POSTHOG_REGIONS: Record<PostHogRegion, { title: string; authBaseUrl: string; baseUrl: string }> = {
  us: {
    title: "US",
    authBaseUrl: "https://us.posthog.com",
    baseUrl: "https://us.posthog.com",
  },
  eu: {
    title: "EU",
    authBaseUrl: "https://eu.posthog.com",
    baseUrl: "https://eu.posthog.com",
  },
};

export type AuthenticatedPostHogAccount = PostHogAccount & {
  accessToken: string;
};

export function createOAuthClient(providerId: string): OAuth.PKCEClient {
  return new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "PostHog",
    providerIcon: "posthog-logo.png",
    providerId,
    description: "Connect your PostHog account to Raycast.",
  });
}

export async function connectPostHogAccount(region: PostHogRegion): Promise<PostHogAccount> {
  const now = new Date().toISOString();
  const accountId = createAccountId(region);
  const providerId = `posthog-${accountId}`;
  const client = createOAuthClient(providerId);
  const clientId = getClientId(POSTHOG_REGIONS[region].authBaseUrl);
  const metadata = await getOAuthServerMetadata(region);
  const authorizationRequest = await client.authorizationRequest({
    endpoint: metadata.authorization_endpoint,
    clientId,
    scope: SCOPES,
  });
  const authorizationResponse = await client.authorize(authorizationRequest);
  const tokenResponse = await exchangeAuthorizationCode(
    metadata.token_endpoint,
    clientId,
    authorizationResponse.authorizationCode,
    authorizationRequest.codeVerifier,
    authorizationRequest.redirectURI
  );

  await client.setTokens(tokenResponse);

  const userInfo = await fetchUserInfo(metadata.userinfo_endpoint, tokenResponse.access_token).catch(() => null);
  const account: PostHogAccount = {
    id: accountId,
    providerId,
    email: userInfo?.email,
    name: userInfo?.name ?? userInfo?.preferred_username,
    region,
    baseUrl: normalizeBaseUrl(metadata.posthog_base_url ?? POSTHOG_REGIONS[region].baseUrl),
    authBaseUrl: POSTHOG_REGIONS[region].authBaseUrl,
    createdAt: now,
    updatedAt: now,
  };

  await saveAccount(account);

  return account;
}

export async function getAuthenticatedAccounts(): Promise<AuthenticatedPostHogAccount[]> {
  const accounts = await getAccounts();
  const results = await Promise.allSettled(
    accounts.map(async (account) => ({
      ...account,
      accessToken: await getAccessToken(account),
    }))
  );

  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

export async function getAccessToken(account: PostHogAccount): Promise<string> {
  const client = createOAuthClient(account.providerId);
  const tokens = await client.getTokens();

  if (!tokens) {
    throw new Error(`No OAuth tokens stored for ${account.email ?? account.id}`);
  }

  if (!tokens.isExpired()) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    throw new Error(`OAuth token expired for ${account.email ?? account.id}. Reconnect the account.`);
  }

  const refreshedTokens = await refreshAccessToken(account, tokens.refreshToken);
  const tokensToStore = {
    ...refreshedTokens,
    refresh_token: refreshedTokens.refresh_token ?? tokens.refreshToken,
  };

  await client.setTokens(tokensToStore);

  return refreshedTokens.access_token;
}

export async function removeTokensForAccount(account: PostHogAccount): Promise<void> {
  await createOAuthClient(account.providerId).removeTokens();
}

async function getOAuthServerMetadata(region: PostHogRegion): Promise<OAuthServerMetadata> {
  const response = await axios.get<OAuthServerMetadata>(
    `${POSTHOG_REGIONS[region].authBaseUrl}/.well-known/oauth-authorization-server`
  );

  return response.data;
}

async function exchangeAuthorizationCode(
  tokenEndpoint: string,
  clientId: string,
  authorizationCode: string,
  codeVerifier: string,
  redirectUri: string
): Promise<PostHogTokenResponse> {
  const response = await axios.post<PostHogTokenResponse>(
    tokenEndpoint,
    new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      client_id: clientId,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data;
}

async function refreshAccessToken(account: PostHogAccount, refreshToken: string): Promise<PostHogTokenResponse> {
  const response = await axios.post<PostHogTokenResponse>(
    `${account.authBaseUrl}/oauth/token/`,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: getClientId(account.authBaseUrl),
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data;
}

async function fetchUserInfo(userInfoEndpoint: string, accessToken: string): Promise<PostHogUserInfo> {
  const response = await axios.get<PostHogUserInfo>(userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

function createAccountId(region: PostHogRegion): string {
  return `${region}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
