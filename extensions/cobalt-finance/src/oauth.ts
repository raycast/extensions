import { OAuth } from "@raycast/api";

const CLIENT_ID = "jxihLeaSnvTNEHoALsPewQeLTUOVChxJ";
const SCOPE = "openid profile email offline_access";

const client = new OAuth.PKCEClient({
  description: "Sign in to your Cobalt account",
  providerIcon: "extension-icon.png",
  providerName: "Cobalt",
  redirectMethod: OAuth.RedirectMethod.Web,
});

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
  id_token?: string;
}

function mcpResource(base: string): string {
  return `${base}/api/mcp`;
}

async function exchangeCode(
  base: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  body.append("resource", mcpResource(base));
  const res = await fetch(`${base}/api/auth/oauth2/token`, {
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  return JSON.parse(text) as TokenResponse;
}

async function refreshToken(
  base: string,
  refresh: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
  body.append("resource", mcpResource(base));
  const res = await fetch(`${base}/api/auth/oauth2/token`, {
    body: body.toString(),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }
  return JSON.parse(text) as TokenResponse;
}

function tokenSetFromResponse(t: TokenResponse) {
  return {
    accessToken: t.access_token,
    expiresIn: t.expires_in,
    idToken: t.id_token,
    refreshToken: t.refresh_token,
    scope: t.scope,
  };
}

let inflight: Promise<string> | null = null;

export async function authorize(base: string): Promise<string> {
  if (inflight) {
    return await inflight;
  }
  inflight = (async () => {
    try {
      return await doAuthorize(base);
    } finally {
      inflight = null;
    }
  })();
  return await inflight;
}

async function doAuthorize(base: string): Promise<string> {
  const existing = await client.getTokens();
  if (existing?.accessToken) {
    if (existing.isExpired()) {
      if (existing.refreshToken) {
        try {
          const refreshed = await refreshToken(base, existing.refreshToken);
          await client.setTokens(tokenSetFromResponse(refreshed));
          return refreshed.access_token;
        } catch {
          await client.removeTokens();
        }
      } else {
        await client.removeTokens();
      }
    } else {
      return existing.accessToken;
    }
  }

  const authRequest = await client.authorizationRequest({
    clientId: CLIENT_ID,
    endpoint: `${base}/api/auth/oauth2/authorize`,
    extraParameters: { resource: mcpResource(base) },
    scope: SCOPE,
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(
    base,
    authorizationCode,
    authRequest.codeVerifier,
    authRequest.redirectURI,
  );
  await client.setTokens(tokenSetFromResponse(tokens));
  return tokens.access_token;
}

export async function logout(): Promise<void> {
  await client.removeTokens();
}
