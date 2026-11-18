const CLIENT_ID = "everyapi-raycast";
const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type OAuthErrorKind =
  "denied" | "expired" | "cancelled" | "invalid-response" | "server";

export class OAuthProtocolError extends Error {
  constructor(
    public readonly kind: OAuthErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "OAuthProtocolError";
  }
}

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
}

interface OAuthWireResponse {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in?: number;
  interval?: number;
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  error?: string;
}

function form(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

async function oauthPost(
  url: string,
  values: Record<string, string>,
  fetch: FetchLike,
): Promise<{ response: Response; body: OAuthWireResponse }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form(values),
  });
  let body: OAuthWireResponse;
  try {
    body = (await response.json()) as OAuthWireResponse;
  } catch {
    throw new OAuthProtocolError(
      "invalid-response",
      "EveryAPI returned an invalid OAuth response",
    );
  }
  return { response, body };
}

function tokensFrom(body: OAuthWireResponse): OAuthTokens {
  if (!body.access_token) {
    throw new OAuthProtocolError(
      "invalid-response",
      "EveryAPI returned an OAuth response without an access token",
    );
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresIn: body.expires_in,
    scope: body.scope,
  };
}

export async function startDeviceAuthorization(
  apiBase: string,
  fetch: FetchLike = globalThis.fetch,
): Promise<DeviceAuthorization> {
  const { response, body } = await oauthPost(
    `${apiBase}/oauth2/device`,
    { client_id: CLIENT_ID, scope: "api" },
    fetch,
  );
  if (!response.ok || !body.device_code || !body.user_code) {
    throw new OAuthProtocolError(
      "server",
      "EveryAPI could not start device authorization",
    );
  }
  const verificationUri =
    body.verification_uri_complete || body.verification_uri;
  if (!verificationUri) {
    throw new OAuthProtocolError(
      "invalid-response",
      "EveryAPI returned no verification URL",
    );
  }
  return {
    deviceCode: body.device_code,
    userCode: body.user_code,
    verificationUri,
    expiresIn: body.expires_in ?? 600,
    interval: body.interval ?? 5,
  };
}

export async function pollDeviceToken(
  apiBase: string,
  authorization: Pick<
    DeviceAuthorization,
    "deviceCode" | "expiresIn" | "interval"
  >,
  dependencies: {
    fetch?: FetchLike;
    wait?: (milliseconds: number) => Promise<void>;
    now?: () => number;
    signal?: AbortSignal;
  } = {},
): Promise<OAuthTokens> {
  const fetch = dependencies.fetch ?? globalThis.fetch;
  const wait =
    dependencies.wait ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const now = dependencies.now ?? Date.now;
  const deadline = now() + authorization.expiresIn * 1000;
  let interval = Math.max(authorization.interval, 0) * 1000;

  while (now() <= deadline) {
    if (dependencies.signal?.aborted) {
      throw new OAuthProtocolError("cancelled", "Sign in was cancelled");
    }
    await wait(interval);
    const { response, body } = await oauthPost(
      `${apiBase}/oauth2/token`,
      {
        grant_type: DEVICE_GRANT,
        device_code: authorization.deviceCode,
        client_id: CLIENT_ID,
      },
      fetch,
    );
    if (response.ok && body.access_token) return tokensFrom(body);
    switch (body.error) {
      case "authorization_pending":
        continue;
      case "slow_down":
        interval += 5000;
        continue;
      case "access_denied":
        throw new OAuthProtocolError("denied", "EveryAPI sign in was denied");
      case "expired_token":
        throw new OAuthProtocolError("expired", "EveryAPI sign in expired");
      default:
        throw new OAuthProtocolError(
          "server",
          "EveryAPI could not complete sign in",
        );
    }
  }
  throw new OAuthProtocolError("expired", "EveryAPI sign in expired");
}

export async function refreshAccessToken(
  apiBase: string,
  refreshToken: string,
  fetch: FetchLike = globalThis.fetch,
): Promise<OAuthTokens> {
  const { response, body } = await oauthPost(
    `${apiBase}/oauth2/token`,
    {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
    },
    fetch,
  );
  if (!response.ok) {
    throw new OAuthProtocolError(
      body.error === "access_denied" ? "denied" : "server",
      "EveryAPI could not refresh the session",
    );
  }
  const tokens = tokensFrom(body);
  return { ...tokens, refreshToken: tokens.refreshToken || refreshToken };
}

export async function revokeToken(
  apiBase: string,
  token: string,
  fetch: FetchLike = globalThis.fetch,
): Promise<void> {
  const { response } = await oauthPost(
    `${apiBase}/oauth2/revoke`,
    { token, client_id: CLIENT_ID },
    fetch,
  );
  if (!response.ok) {
    throw new OAuthProtocolError(
      "server",
      "EveryAPI could not revoke the session",
    );
  }
}
