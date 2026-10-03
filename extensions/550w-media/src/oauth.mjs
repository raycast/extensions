export const host = "https://www.550wai.cn";
export const scope = "credits:read tasks:read tasks:submit media:upload";
class OAuthFailure extends Error {
  constructor(stage, code) {
    super(`Authorization not confirmed (${stage}/${code})`);
    this.stage = stage;
    this.code = code;
  }
}
export function oauthDiagnostic(error) {
  return error instanceof OAuthFailure
    ? `${error.stage}/${error.code}`
    : "session/unconfirmed";
}
async function atStage(stage, action) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof OAuthFailure) throw error;
    throw new OAuthFailure(stage, "failed");
  }
}
export function regionalRedirect(region) {
  if (!["cn", "global"].includes(region))
    throw new OAuthFailure("callback", "invalid_region");
  return `https://raycast.com/redirect?packageName=${region === "cn" ? "550w-media-cn" : "550w-media"}`;
}
export function validateRedirect(value, region) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "raycast.com" ||
      url.pathname !== "/redirect" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      value !== regionalRedirect(region)
    )
      throw new Error();
    return value;
  } catch {
    throw new OAuthFailure("callback", "invalid_redirect");
  }
}
export function effectiveAuthorizationRequest(request, region) {
  const redirectURI = validateRedirect(regionalRedirect(region), region);
  // Keep the SDK-created state, PKCE and client-side Web interception session.
  // Its toURL closure uses the native redirectURI, independently of this object.
  let url;
  try {
    url = new URL(request.toURL());
    if (
      url.origin !== host ||
      url.pathname !== "/oauth2/authorize" ||
      url.username ||
      url.password ||
      url.hash
    )
      throw new Error();
  } catch {
    throw new OAuthFailure("callback", "invalid_authorization_url");
  }
  url.searchParams.set("redirect_uri", redirectURI);
  validateRedirect(url.searchParams.get("redirect_uri"), region);
  return { ...request, redirectURI, toURL: () => url.toString() };
}
export function createSession({ client, storage, region, fetcher = fetch }) {
  if (!["cn", "global"].includes(region)) throw new Error("Invalid region");
  const resource = `${host}/media-api/${region}`;
  const key = `oauth-client-${region}`;
  const redirect = validateRedirect(regionalRedirect(region), region);
  let flight;
  async function json(path, options) {
    try {
      const response = await fetcher(host + path, {
        ...options,
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        throw new OAuthFailure(
          path === "/oauth2/register"
            ? "registration"
            : path === "/oauth2/revoke"
              ? "revocation"
              : "token",
          `http_${response.status}`,
        );
      const raw = await response.text();
      if (path === "/oauth2/revoke" && !raw.trim()) return {};
      if (raw.length > 65536) throw new Error();
      return JSON.parse(raw);
    } catch (error) {
      if (error instanceof OAuthFailure) throw error;
      throw new Error("Authorization request failed. Reconnect your account.");
    }
  }
  async function registration() {
    const saved = await storage.getItem(key);
    if (typeof saved === "string" && saved) return saved;
    const data = await json("/oauth2/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name:
          region === "cn"
            ? "550W AI去字幕去水印"
            : "550W Watermark & Text Eraser",
        resource,
        redirect_uris: [redirect],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
        scope,
      }),
    });
    if (
      typeof data.client_id !== "string" ||
      !data.client_id ||
      data.client_secret
    )
      throw new Error("Public OAuth registration rejected");
    await storage.setItem(key, data.client_id);
    return data.client_id;
  }
  async function exchange(params, previous) {
    const data = await json("/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, resource }),
    });
    if (
      typeof data.access_token !== "string" ||
      !data.access_token ||
      data.token_type?.toLowerCase() !== "bearer" ||
      (data.resource && data.resource !== resource) ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in <= 0
    )
      throw new Error("Invalid OAuth token response");
    const refresh = data.refresh_token ?? previous?.refreshToken;
    if (typeof refresh !== "string" || !refresh)
      throw new Error("Refresh token missing");
    await client.setTokens({ ...data, refresh_token: refresh });
    return data.access_token;
  }
  async function acquire(interactive) {
    const tokens = await atStage("storage", () => client.getTokens());
    if (tokens && !tokens.isExpired()) return tokens.accessToken;
    if (!tokens && !interactive)
      throw new Error("Connect your 550W account first");
    const clientId = await atStage("registration", registration);
    if (tokens?.refreshToken)
      return atStage("refresh", () =>
        exchange(
          {
            grant_type: "refresh_token",
            refresh_token: tokens.refreshToken,
            client_id: clientId,
          },
          tokens,
        ),
      );
    if (!interactive) throw new Error("Connect your 550W account first");
    const nativeRequest = await atStage("initialization", () =>
      client.authorizationRequest({
        endpoint: host + "/oauth2/authorize",
        clientId,
        scope,
        extraParameters: {
          resource,
          redirect_uri: redirect,
          ui_locales: region === "cn" ? "zh-CN" : "en",
        },
      }),
    );
    const request = effectiveAuthorizationRequest(nativeRequest, region);
    const response = await atStage("authorization", () =>
      client.authorize(request),
    );
    return atStage("token", () =>
      exchange({
        grant_type: "authorization_code",
        client_id: clientId,
        code: response.authorizationCode,
        code_verifier: request.codeVerifier,
        redirect_uri: request.redirectURI,
      }),
    );
  }
  return {
    accessToken(interactive = false) {
      if (!flight)
        flight = acquire(interactive).finally(() => {
          flight = undefined;
        });
      return flight;
    },
    async disconnect() {
      if (flight) await flight.catch(() => {});
      let failed = false;
      try {
        const tokens = await client.getTokens(),
          clientId = await storage.getItem(key);
        if (tokens && !clientId) failed = true;
        if (tokens && clientId)
          await json("/oauth2/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              token: tokens.refreshToken ?? tokens.accessToken,
              token_type_hint: tokens.refreshToken
                ? "refresh_token"
                : "access_token",
            }),
          });
      } catch {
        failed = true;
      } finally {
        await client.removeTokens();
      }
      if (failed)
        throw new Error(
          "Local authorization removed; remote revocation not confirmed",
        );
    },
  };
}
