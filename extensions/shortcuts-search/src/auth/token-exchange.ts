export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  scope?: string;
}

interface AuthorizationCodeExchange {
  endpoint: string;
  clientId: string;
  authorizationCode: string;
  codeVerifier: string;
  redirectUri: string;
}

interface RefreshTokenExchange {
  endpoint: string;
  clientId: string;
  refreshToken: string;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export class OAuthTokenError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly status: number
  ) {
    super(message);
    this.name = "OAuthTokenError";
  }
}

export async function exchangeAuthorizationCode(
  input: AuthorizationCodeExchange,
  fetcher: Fetcher = fetch
): Promise<TokenResponse> {
  return requestToken(
    input.endpoint,
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: input.clientId,
      code: input.authorizationCode,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
    }),
    fetcher
  );
}

export async function refreshAccessToken(
  input: RefreshTokenExchange,
  fetcher: Fetcher = fetch
): Promise<TokenResponse> {
  const response = await requestToken(
    input.endpoint,
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: input.clientId,
      refresh_token: input.refreshToken,
    }),
    fetcher
  );

  return {
    ...response,
    refresh_token: response.refresh_token ?? input.refreshToken,
  };
}

async function requestToken(endpoint: string, body: URLSearchParams, fetcher: Fetcher): Promise<TokenResponse> {
  const response = await fetcher(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    const description =
      typeof payload.error_description === "string"
        ? payload.error_description
        : typeof payload.error === "string"
          ? payload.error
          : `OAuth token request failed with status ${response.status}`;
    throw new OAuthTokenError(
      description,
      typeof payload.error === "string" ? payload.error : undefined,
      response.status
    );
  }

  if (typeof payload.access_token !== "string" || payload.access_token.length === 0) {
    throw new Error("OAuth token response is missing an access token");
  }

  return {
    access_token: payload.access_token,
    refresh_token: typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
    id_token: typeof payload.id_token === "string" ? payload.id_token : undefined,
    expires_in: typeof payload.expires_in === "number" ? payload.expires_in : undefined,
    scope: typeof payload.scope === "string" ? payload.scope : undefined,
  };
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload: unknown = await response.json();
    return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
