import { LocalStorage, OAuth, Toast, environment, getPreferenceValues, showToast } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { finishSignIn, resolveAccount } from "./account";
import { REQUEST_TIMEOUT_MS } from "./mcp";
import {
  CODE_EXCHANGE_TIMEOUT_MS,
  REFRESH_TIMEOUT_MS,
  TOOL_SIGN_IN_WAIT_MS,
  TokenEndpointError,
  registerClient,
  refreshAccessToken,
  requestTokens,
  signInOnce,
  withLease,
  type KeyValueStorage,
  type TokenResponse,
  type TokenSnapshot,
} from "./refresh";
import type { Credentials } from "./session";
import { abortableSleep } from "./time";

export const SITE_URL = "https://www.socialfaktory.com";
export const MCP_URL = `${SITE_URL}/mcp`;

const AUTHORIZE_URL = `${SITE_URL}/oauth/authorize`;
const TOKEN_URL = `${SITE_URL}/oauth/token`;
const REGISTER_URL = `${SITE_URL}/oauth/register`;
const SCOPE = "read generate";
const REGISTRATION_KEY = "oauth-registration";
const ACCOUNT_KEY = "oauth-account";
const ACCOUNT_LEASE_KEY = "oauth-account-lease";

type Registration = { clientId: string; redirectUri: string; scope: string };

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.App,
  providerName: "SocialFaktory",
  providerIcon: "extension-icon.png",
  description: "Connect your SocialFaktory account to write posts and follow your schedule.",
});

export const localStore: KeyValueStorage & { allItems(): Promise<Record<string, string>> } = {
  getItem: (key) => LocalStorage.getItem<string>(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
  removeItem: (key) => LocalStorage.removeItem(key),
  allItems: async () =>
    Object.fromEntries(Object.entries(await LocalStorage.allItems()).map(([key, value]) => [key, String(value)])),
};

const timing = {
  storage: localStore,
  now: () => Date.now(),
  sleep: abortableSleep,
  random: Math.random,
};

let waitingToast: Promise<Toast> | undefined;

function showWaiting(active: boolean) {
  if (environment.entryPointType !== "command") return;
  if (active) {
    waitingToast ??= showToast({ style: Toast.Style.Animated, title: "Finishing sign-in in another window" });
    return;
  }
  void waitingToast?.then((toast) => toast.hide());
  waitingToast = undefined;
}

export function personalToken(): string | undefined {
  return getPreferenceValues<Preferences>().apiToken?.trim() || undefined;
}

let pending: Promise<string> | undefined;
let renewing: Promise<string | undefined> | undefined;

export function authorize(): Promise<string> {
  pending ??= signIn().finally(() => {
    pending = undefined;
  });
  return pending;
}

export function accountKey(): Promise<string> {
  return resolveAccount({
    personalToken,
    readAccountId: () => LocalStorage.getItem<string>(ACCOUNT_KEY),
    saveAccountId: (id) => LocalStorage.setItem(ACCOUNT_KEY, id),
    newAccountId: randomUUID,
    underLease: (work) => withLease(timing, ACCOUNT_LEASE_KEY, work),
  });
}

export async function hasFreshCredentials(): Promise<boolean> {
  if (personalToken()) return true;
  const tokens = await oauthClient.getTokens();
  return Boolean(tokens?.accessToken && !tokens.isExpired());
}

export async function signInAgain(): Promise<void> {
  await signInOnce(
    {
      ...timing,
      readTokens,
      signInWithBrowser,
      waiting: showWaiting,
      adopt: false,
      beforeBrowser: () => oauthClient.removeTokens(),
    },
    undefined,
  );
}

export async function credentials(): Promise<Credentials> {
  const token = personalToken();
  if (token) return { token, type: "personal" };
  return { token: await authorize(), type: "oauth" };
}

export function renewAccessToken(staleAccessToken: string): Promise<string | undefined> {
  renewing ??= refreshAccessToken(
    {
      ...timing,
      readTokens,
      saveTokens: async (response, previousRefreshToken) => {
        await oauthClient.setTokens({ ...response, refresh_token: response.refresh_token ?? previousRefreshToken });
      },
      refresh: requestRefresh,
      forgetTokens,
    },
    staleAccessToken,
  ).finally(() => {
    renewing = undefined;
  });
  return renewing;
}

export async function forgetTokens(staleAccessToken: string): Promise<void> {
  const tokens = await oauthClient.getTokens();
  if (tokens?.accessToken === staleAccessToken) await oauthClient.removeTokens();
}

async function signIn(): Promise<string> {
  const tokens = await oauthClient.getTokens();
  if (tokens?.accessToken && !tokens.isExpired()) return tokens.accessToken;
  if (tokens?.refreshToken) {
    const refreshed = await renewAccessToken(tokens.accessToken);
    if (refreshed) return refreshed;
  }
  if (tokens) await forgetTokens(tokens.accessToken);
  const tool = environment.entryPointType === "tool";
  return signInOnce(
    {
      ...timing,
      readTokens,
      signInWithBrowser,
      waiting: showWaiting,
      waitLimitMs: tool ? TOOL_SIGN_IN_WAIT_MS : undefined,
      takeOver: !tool,
      browserLimitMs: tool ? TOOL_SIGN_IN_WAIT_MS : undefined,
    },
    tokens?.accessToken,
  );
}

async function readTokens(): Promise<TokenSnapshot | undefined> {
  const tokens = await oauthClient.getTokens();
  if (!tokens?.accessToken) return undefined;
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, expired: tokens.isExpired() };
}

async function requestRefresh(refreshToken: string): Promise<TokenResponse> {
  const registration = await storedRegistration();
  if (!registration) {
    throw new TokenEndpointError("invalid_client", 401, "Raycast is not registered with SocialFaktory");
  }
  return tokenRequest(
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: registration.clientId,
      resource: MCP_URL,
    },
    REFRESH_TIMEOUT_MS,
  );
}

async function tokenRequest(params: Record<string, string>, timeoutMs: number): Promise<TokenResponse> {
  try {
    return await requestTokens(fetch, TOKEN_URL, params, timeoutMs);
  } catch (error) {
    if (error instanceof TokenEndpointError && error.code === "invalid_client") {
      await LocalStorage.removeItem(REGISTRATION_KEY);
    }
    throw error;
  }
}

async function signInWithBrowser(consented: () => void): Promise<string> {
  const stored = await storedRegistration();
  let request = await authorizationRequest(stored?.clientId ?? "unregistered");
  let registration = stored;
  if (!registration || registration.redirectUri !== request.redirectURI || registration.scope !== SCOPE) {
    registration = await register(request.redirectURI);
    request = await authorizationRequest(registration.clientId);
  }

  const { authorizationCode } = await oauthClient.authorize(request);
  consented();
  const tokens = await tokenRequest(
    {
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectURI,
      client_id: registration.clientId,
      resource: MCP_URL,
    },
    CODE_EXCHANGE_TIMEOUT_MS,
  );
  await finishSignIn({
    newAccountId: randomUUID,
    saveAccountId: (id) => LocalStorage.setItem(ACCOUNT_KEY, id),
    saveTokens: () => oauthClient.setTokens(tokens),
  });
  return tokens.access_token;
}

function authorizationRequest(clientId: string): Promise<OAuth.AuthorizationRequest> {
  return oauthClient.authorizationRequest({
    endpoint: AUTHORIZE_URL,
    clientId,
    scope: SCOPE,
    extraParameters: { resource: MCP_URL },
  });
}

async function register(redirectUri: string): Promise<Registration> {
  const clientId = await registerClient(fetch, REGISTER_URL, redirectUri, SCOPE, REQUEST_TIMEOUT_MS);
  const registration = { clientId, redirectUri, scope: SCOPE };
  await LocalStorage.setItem(REGISTRATION_KEY, JSON.stringify(registration));
  return registration;
}

async function storedRegistration(): Promise<Registration | undefined> {
  const value = await LocalStorage.getItem<string>(REGISTRATION_KEY);
  if (!value) return undefined;
  try {
    return JSON.parse(value) as Registration;
  } catch {
    return undefined;
  }
}
