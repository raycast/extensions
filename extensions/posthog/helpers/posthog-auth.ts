import { OAuth } from "@raycast/api";
import axios from "axios";
import { PostHogAccount, PostHogRegion, normalizeBaseUrl, upsertAccount } from "./account-model";
import { getAccounts, saveAccounts } from "./accounts";
import { firstRejectedError, toError } from "./promise-utils";

const CLIENT_METADATA_PATH = "/api/oauth/raycast/client-metadata";
const OAUTH_PROXY_BASE_URL = "https://oauth.posthog.com";
// The OAuth proxy routes users to US/EU, but the Raycast CIMD document is hosted on the app domain.
const RAYCAST_CLIENT_ID_BASE_URL = "https://us.posthog.com";

function getClientId(authBaseUrl: string): string {
  return `${authBaseUrl}${CLIENT_METADATA_PATH}`;
}
const SCOPES = [
  "openid",
  "profile",
  "email",
  "project:read",
  "feature_flag:read",
  "cohort:read",
  "dashboard:read",
  "person:read",
].join(" ");

type OAuthServerMetadata = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  posthog_region?: string;
  posthog_base_url?: string;
};

type PostHogTokenResponse = OAuth.TokenResponse & {
  token_type?: string;
  posthog_region?: string;
  posthog_base_url?: string;
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

export type AccountFailure = {
  account: PostHogAccount;
  error: Error;
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

export async function connectPostHogAccount(): Promise<PostHogAccount> {
  const now = new Date().toISOString();
  const client = createOAuthClient("posthog-connect");
  const clientId = getClientId(RAYCAST_CLIENT_ID_BASE_URL);

  const metadata = await getOAuthServerMetadata(OAUTH_PROXY_BASE_URL);
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
  const userInfo = await fetchUserInfo(metadata.userinfo_endpoint, tokenResponse.access_token);

  const region = resolvePostHogRegion(
    tokenResponse.posthog_region ?? metadata.posthog_region,
    tokenResponse.posthog_base_url
  );
  const accountId = createAccountId(region, userInfo);
  const providerId = `posthog-${accountId}`;
  const existingAccount = (await getAccounts()).find((account) => account.id === accountId);

  const account: PostHogAccount = {
    id: accountId,
    providerId,
    clientId,
    email: userInfo?.email,
    name: userInfo?.name ?? userInfo?.preferred_username,
    region,
    baseUrl: normalizeBaseUrl(
      tokenResponse.posthog_base_url ?? metadata.posthog_base_url ?? POSTHOG_REGIONS[region].baseUrl
    ),
    authBaseUrl: OAUTH_PROXY_BASE_URL,
    tokenEndpoint: metadata.token_endpoint,
    createdAt: existingAccount?.createdAt ?? now,
    updatedAt: now,
  };

  await createOAuthClient(providerId).setTokens(tokenResponse);
  await saveConnectedAccount(account);

  return account;
}

export async function getAuthenticatedAccounts(): Promise<{
  accounts: AuthenticatedPostHogAccount[];
  failures: AccountFailure[];
}> {
  const accounts = await getAccounts();
  const results = await Promise.allSettled(
    accounts.map(async (account) => ({
      ...account,
      accessToken: await getAccessToken(account),
    }))
  );

  const authenticated: AuthenticatedPostHogAccount[] = [];
  const failures: AccountFailure[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      authenticated.push(result.value);
    } else {
      failures.push({ account: accounts[index], error: toError(result.reason) });
    }
  });

  if (accounts.length > 0 && authenticated.length === 0) {
    throw firstRejectedError(results, "Could not authenticate any connected PostHog accounts.");
  }

  return { accounts: authenticated, failures };
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

async function getOAuthServerMetadata(authBaseUrl: string): Promise<OAuthServerMetadata> {
  const response = await axios.get<OAuthServerMetadata>(`${authBaseUrl}/.well-known/oauth-authorization-server`);

  return response.data;
}

async function postForm<T>(url: string, params: Record<string, string>): Promise<T> {
  const response = await axios.post<T>(url, new URLSearchParams(params), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
}

async function exchangeAuthorizationCode(
  tokenEndpoint: string,
  clientId: string,
  authorizationCode: string,
  codeVerifier: string,
  redirectUri: string
): Promise<PostHogTokenResponse> {
  return postForm<PostHogTokenResponse>(tokenEndpoint, {
    grant_type: "authorization_code",
    code: authorizationCode,
    client_id: clientId,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });
}

async function refreshAccessToken(account: PostHogAccount, refreshToken: string): Promise<PostHogTokenResponse> {
  // Prefer the token endpoint advertised by the OAuth server metadata (matching the initial code
  // exchange); fall back to the conventional path for accounts connected before it was persisted.
  const tokenEndpoint = account.tokenEndpoint ?? `${account.authBaseUrl}/oauth/token/`;

  return postForm<PostHogTokenResponse>(tokenEndpoint, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: account.clientId ?? getClientId(account.authBaseUrl),
  });
}

async function fetchUserInfo(userInfoEndpoint: string, accessToken: string): Promise<PostHogUserInfo> {
  const response = await axios.get<PostHogUserInfo>(userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

async function saveConnectedAccount(account: PostHogAccount): Promise<void> {
  const accounts = await getAccounts();

  await saveAccounts(upsertAccount(accounts, account));
}

function createAccountId(region: PostHogRegion, userInfo: PostHogUserInfo): string {
  const identity = userInfo.sub ?? userInfo.email ?? userInfo.preferred_username ?? userInfo.name;

  if (!identity) {
    throw new Error("PostHog did not return an account identity. Try reconnecting.");
  }

  return `${region}-${Buffer.from(identity, "utf8").toString("base64url")}`;
}

function resolvePostHogRegion(region: string | undefined, baseUrl: string | undefined): PostHogRegion {
  if (region === "eu" || region === "us") {
    return region;
  }

  if (baseUrl) {
    try {
      if (new URL(baseUrl).hostname === "eu.posthog.com") {
        return "eu";
      }
    } catch {
      // Ignore invalid URLs and fall back to the default region below.
    }
  }

  return "us";
}
