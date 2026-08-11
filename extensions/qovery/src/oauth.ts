import { OAuth } from "@raycast/api";

const AUTH_DOMAIN = "https://auth.qovery.com";
const CLIENT_ID = "S4fQF5rkTng8CqHsc1kw41fG09u4R7A0";
const AUDIENCE = "https://core.qovery.com";
const REDIRECT_URI = "https://raycast.com/redirect/extension";

export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Qovery",
  providerIcon: "extension-icon.png",
  providerId: "qovery",
  description: "Sign in to access all your Qovery organizations",
});

let authenticationPromise: Promise<string> | undefined;
let authenticationGeneration = 0;
let tokenOperationQueue: Promise<void> = Promise.resolve();
let authenticationAllowed = true;
let isSigningOut = false;

class AuthenticationCancelledError extends Error {
  constructor() {
    super("Authentication was cancelled");
  }
}

function assertAuthenticationIsCurrent(generation: number): void {
  if (generation !== authenticationGeneration) {
    throw new AuthenticationCancelledError();
  }
}

function runTokenOperation<T>(operation: () => Promise<T>): Promise<T> {
  const result = tokenOperationQueue.then(operation, operation);
  tokenOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function persistTokens(tokens: OAuth.TokenResponse, generation: number): Promise<void> {
  await runTokenOperation(async () => {
    assertAuthenticationIsCurrent(generation);
    await oauthClient.setTokens(tokens);
    assertAuthenticationIsCurrent(generation);
  });
}

async function exchangeAuthorizationCode(
  request: OAuth.AuthorizationRequest,
  authorizationCode: string,
): Promise<OAuth.TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    code: authorizationCode,
    code_verifier: request.codeVerifier,
    redirect_uri: REDIRECT_URI,
  });

  return requestTokens(body);
}

async function refreshAccessToken(refreshToken: string): Promise<OAuth.TokenResponse> {
  const response = await requestTokens(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  );

  response.refresh_token ??= refreshToken;
  return response;
}

async function requestTokens(body: URLSearchParams): Promise<OAuth.TokenResponse> {
  const response = await fetch(`${AUTH_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const details = (await response.json().catch(() => undefined)) as
      { error?: string; error_description?: string } | undefined;
    throw new Error(details?.error_description || details?.error || `Authentication failed (${response.status})`);
  }

  return (await response.json()) as OAuth.TokenResponse;
}

async function authenticate(generation: number): Promise<string> {
  const tokens = await runTokenOperation(() => oauthClient.getTokens());
  assertAuthenticationIsCurrent(generation);

  if (tokens?.accessToken && !tokens.isExpired()) {
    return tokens.accessToken;
  }

  if (tokens?.refreshToken) {
    try {
      const refreshedTokens = await refreshAccessToken(tokens.refreshToken);
      await persistTokens(refreshedTokens, generation);
      return refreshedTokens.access_token;
    } catch {
      await runTokenOperation(async () => {
        assertAuthenticationIsCurrent(generation);
        await oauthClient.removeTokens();
      });
    }
  }

  const request = await oauthClient.authorizationRequest({
    endpoint: `${AUTH_DOMAIN}/authorize`,
    clientId: CLIENT_ID,
    scope: "openid profile email offline_access",
    extraParameters: {
      audience: AUDIENCE,
      redirect_uri: REDIRECT_URI,
    },
  });
  const { authorizationCode } = await oauthClient.authorize(request);
  assertAuthenticationIsCurrent(generation);
  const newTokens = await exchangeAuthorizationCode(request, authorizationCode);
  await persistTokens(newTokens, generation);
  return newTokens.access_token;
}

export function getAccessToken(allowInteractiveAuthentication = false): Promise<string> {
  if (isSigningOut) {
    return Promise.reject(new AuthenticationCancelledError());
  }

  if (allowInteractiveAuthentication) {
    authenticationAllowed = true;
  }

  if (!authenticationAllowed) {
    return Promise.reject(new AuthenticationCancelledError());
  }

  // React development mode can start the initial data-loading effect twice.
  // A single-use authorization code must only be exchanged once, so every
  // concurrent API request shares the same authentication operation.
  if (!authenticationPromise) {
    const promise = authenticate(authenticationGeneration).finally(() => {
      if (authenticationPromise === promise) {
        authenticationPromise = undefined;
      }
    });
    authenticationPromise = promise;
  }
  return authenticationPromise;
}

export async function signOut(): Promise<void> {
  isSigningOut = true;
  authenticationAllowed = false;
  authenticationGeneration += 1;

  try {
    await runTokenOperation(() => oauthClient.removeTokens());
  } finally {
    authenticationPromise = undefined;
    isSigningOut = false;
  }
}
