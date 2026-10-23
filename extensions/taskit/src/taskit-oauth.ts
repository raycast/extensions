export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface RegisteredClient {
  client_id: string;
}

interface OAuthErrorBody {
  error?: string;
  error_description?: string;
}

export async function registerPublicClient(
  issuer: string,
  redirectUri: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RegisteredClient> {
  const response = await fetchImpl(`${trim(issuer)}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "Taskit for Raycast",
    }),
  });
  const payload = await readBody<RegisteredClient & OAuthErrorBody>(response);
  if (!payload.client_id) throw new Error("Taskit did not return a client id");
  return payload;
}

export async function exchangeAuthorizationCode(options: {
  issuer: string;
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}): Promise<OAuthTokenResponse> {
  return tokenRequest(
    options.issuer,
    {
      grant_type: "authorization_code",
      code: options.code,
      code_verifier: options.codeVerifier,
      redirect_uri: options.redirectUri,
      client_id: options.clientId,
    },
    options.fetchImpl,
  );
}

export async function refreshAccessToken(options: {
  issuer: string;
  clientId: string;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}): Promise<OAuthTokenResponse> {
  return tokenRequest(
    options.issuer,
    {
      grant_type: "refresh_token",
      refresh_token: options.refreshToken,
      client_id: options.clientId,
    },
    options.fetchImpl,
  );
}

async function tokenRequest(
  issuer: string,
  fields: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams(fields);
  const response = await fetchImpl(`${trim(issuer)}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const payload = await readBody<OAuthTokenResponse & OAuthErrorBody>(response);
  if (!payload.access_token)
    throw new Error("Taskit did not return an access token");
  return payload;
}

async function readBody<T extends OAuthErrorBody>(
  response: Response,
): Promise<T> {
  const text = await response.text();
  let payload = {} as T;
  if (text) {
    try {
      payload = JSON.parse(text) as T;
    } catch {
      payload = {} as T;
    }
  }
  if (!response.ok || payload.error) {
    throw new Error(
      payload.error_description ||
        payload.error ||
        response.statusText ||
        "Sign-in failed",
    );
  }
  return payload;
}

function trim(issuer: string): string {
  return issuer.replace(/\/$/, "");
}
