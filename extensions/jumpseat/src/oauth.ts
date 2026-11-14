import { createHash, randomUUID } from "node:crypto";
import { LocalStorage, OAuth } from "@raycast/api";
import { getJumpseatConfiguration } from "./config";
import { clearFlightCache, migrateFlightCache } from "./flight-cache";
import {
  jumpseatConfigurationId,
  legacyJumpseatConfigurationId,
  resolveStoredCentralOAuthIssuer,
  type JumpseatConfiguration,
} from "./config-values";
import { REQUEST_TIMEOUT_MS, responseErrorMessage } from "./http";
import {
  buildAuthorizationCodeExchangeRequest,
  buildAuthorizationRequestPlan,
  buildRefreshRequest,
  isCentralOAuthAuthorizationServer,
  isDefinitiveOAuthTokenFailure,
  JUMPSEAT_OAUTH_CLIENT_ID,
  JUMPSEAT_OAUTH_SCOPE,
  oauthEndpoint,
  oauthForm,
  resolveStoredAuthProtocol,
  type JumpseatAuthProtocol,
} from "./oauth-protocol";
import {
  parseOAuthTokenResponse,
  parseRefreshResponse,
} from "./oauth-response";

const INSTALL_ID_KEY = "jumpseat-client-install-id";
const AUTH_CONFIGURATION_KEY = "jumpseat-auth-configuration";
const AUTH_PROTOCOL_KEY = "jumpseat-auth-protocol";
const AUTH_ISSUER_KEY = "jumpseat-auth-issuer";
const AUTH_DISCOVERY_TIMEOUT_MS = 5_000;
const AUTH_DISCOVERY_ERROR_MESSAGE =
  "Jumpseat could not start sign-in. Please try again shortly.";

export const jumpseatOAuthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Jumpseat",
  providerIcon: "extension-icon.png",
  description:
    "Connect your Jumpseat account to see your and your friends' upcoming flights.",
});

export class JumpseatAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JumpseatAuthenticationError";
  }
}

async function exchangeAuthorizationCode(
  configuration: JumpseatConfiguration,
  protocol: JumpseatAuthProtocol,
  request: OAuth.AuthorizationRequest,
  authorizationCode: string,
): Promise<OAuth.TokenResponse> {
  const tokenRequest = buildAuthorizationCodeExchangeRequest(
    configuration,
    protocol,
    {
      code: authorizationCode,
      redirectUri: request.redirectURI,
      codeVerifier: request.codeVerifier,
    },
  );
  const response = await fetch(tokenRequest.url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": tokenRequest.contentType,
    },
    body: tokenRequest.body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new JumpseatAuthenticationError(
      await responseErrorMessage(
        response,
        "Jumpseat could not complete sign-in.",
      ),
    );
  }

  const tokens = parseOAuthTokenResponse(
    await response.json(),
    JUMPSEAT_OAUTH_SCOPE,
  );
  if (!tokens) {
    throw new JumpseatAuthenticationError(
      "Jumpseat returned an unexpected sign-in response.",
    );
  }
  return tokens;
}

interface FreshAuthorizationProtocol {
  protocol: JumpseatAuthProtocol;
  issuer?: string;
}

async function discoverFreshAuthorizationProtocol(
  configuration: JumpseatConfiguration,
): Promise<FreshAuthorizationProtocol> {
  let response: Response;
  try {
    response = await fetch(
      oauthEndpoint(
        configuration.authBaseUrl,
        "/.well-known/oauth-authorization-server",
      ),
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(AUTH_DISCOVERY_TIMEOUT_MS),
      },
    );
  } catch {
    throw new JumpseatAuthenticationError(AUTH_DISCOVERY_ERROR_MESSAGE);
  }
  if (response.status === 404) return { protocol: "legacy" };
  if (!response.ok) {
    throw new JumpseatAuthenticationError(AUTH_DISCOVERY_ERROR_MESSAGE);
  }
  const document = await response.json().catch(() => null);
  if (!isCentralOAuthAuthorizationServer(document, configuration.authBaseUrl)) {
    throw new JumpseatAuthenticationError(AUTH_DISCOVERY_ERROR_MESSAGE);
  }
  return { protocol: "central", issuer: configuration.authBaseUrl };
}

async function authorize(
  configuration: JumpseatConfiguration,
): Promise<string> {
  const authorizationProtocol =
    await discoverFreshAuthorizationProtocol(configuration);
  const { protocol } = authorizationProtocol;
  const request = await jumpseatOAuthClient.authorizationRequest(
    buildAuthorizationRequestPlan(configuration, protocol),
  );
  const { authorizationCode } = await jumpseatOAuthClient.authorize(request);
  const tokens = await exchangeAuthorizationCode(
    configuration,
    protocol,
    request,
    authorizationCode,
  );
  await jumpseatOAuthClient.setTokens(tokens);
  await LocalStorage.setItem(
    AUTH_CONFIGURATION_KEY,
    protocol === "legacy"
      ? legacyJumpseatConfigurationId()
      : jumpseatConfigurationId(configuration),
  );
  await LocalStorage.setItem(AUTH_PROTOCOL_KEY, protocol);
  if (authorizationProtocol.issuer) {
    await LocalStorage.setItem(AUTH_ISSUER_KEY, authorizationProtocol.issuer);
  } else {
    await LocalStorage.removeItem(AUTH_ISSUER_KEY);
  }
  return tokens.access_token;
}

async function revokeCentralRefreshToken(
  issuer: string,
  refreshToken: string,
): Promise<void> {
  try {
    await fetch(oauthEndpoint(issuer, "/oauth/revoke"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: oauthForm({
        token: refreshToken,
        token_type_hint: "refresh_token",
        client_id: JUMPSEAT_OAUTH_CLIENT_ID,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Disconnect must still remove local credentials if the network or the
    // authority is unavailable. The server may revoke the token later.
  }
}

async function revokeLegacyRefreshToken(
  configuration: JumpseatConfiguration,
  refreshToken: string,
): Promise<void> {
  try {
    await fetch(new URL("/api/v1/auth/logout", configuration.apiBaseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Local disconnect remains available during a legacy API outage.
  }
}

async function clearStoredAuthorization(
  configuration: JumpseatConfiguration,
  { revoke = false }: { revoke?: boolean } = {},
): Promise<void> {
  const [
    tokensResult,
    storedConfigurationIdResult,
    storedProtocolResult,
    storedIssuerResult,
  ] = await Promise.allSettled([
    revoke ? jumpseatOAuthClient.getTokens() : Promise.resolve(undefined),
    LocalStorage.getItem<string>(AUTH_CONFIGURATION_KEY),
    LocalStorage.getItem<string>(AUTH_PROTOCOL_KEY),
    LocalStorage.getItem<string>(AUTH_ISSUER_KEY),
  ]);
  const tokens =
    tokensResult.status === "fulfilled" ? tokensResult.value : undefined;
  const storedConfigurationId =
    storedConfigurationIdResult.status === "fulfilled"
      ? storedConfigurationIdResult.value
      : undefined;
  const storedProtocol =
    storedProtocolResult.status === "fulfilled"
      ? storedProtocolResult.value
      : undefined;
  const storedIssuer =
    storedIssuerResult.status === "fulfilled"
      ? storedIssuerResult.value
      : undefined;
  const protocol = resolveStoredAuthProtocol(
    storedConfigurationId,
    storedProtocol,
    configuration,
  );
  const issuer =
    protocol === "central"
      ? resolveStoredCentralOAuthIssuer(storedIssuer, configuration)
      : undefined;
  const revocation =
    tokens?.refreshToken && protocol
      ? protocol === "legacy"
        ? revokeLegacyRefreshToken(configuration, tokens.refreshToken)
        : issuer
          ? revokeCentralRefreshToken(issuer, tokens.refreshToken)
          : Promise.resolve()
      : Promise.resolve();

  // Revocation is best-effort, but local deletion is the disconnect contract.
  // Start every deletion and propagate a local storage failure to the caller.
  await Promise.all([
    revocation,
    Promise.resolve().then(clearFlightCache),
    jumpseatOAuthClient.removeTokens(),
    LocalStorage.removeItem(AUTH_CONFIGURATION_KEY),
    LocalStorage.removeItem(AUTH_PROTOCOL_KEY),
    LocalStorage.removeItem(AUTH_ISSUER_KEY),
    LocalStorage.removeItem(INSTALL_ID_KEY),
  ]);
}

interface StoredJumpseatAuthorization {
  tokens: OAuth.TokenSet;
  protocol: JumpseatAuthProtocol;
  issuer?: string;
}

async function getStoredAuthorization(
  configuration: JumpseatConfiguration,
): Promise<StoredJumpseatAuthorization | undefined> {
  await migrateFlightCache();
  const tokens = await jumpseatOAuthClient.getTokens();
  if (!tokens) {
    clearFlightCache();
    return undefined;
  }

  const [storedConfigurationId, storedProtocol, storedIssuer] =
    await Promise.all([
      LocalStorage.getItem<string>(AUTH_CONFIGURATION_KEY),
      LocalStorage.getItem<string>(AUTH_PROTOCOL_KEY),
      LocalStorage.getItem<string>(AUTH_ISSUER_KEY),
    ]);
  const protocol = resolveStoredAuthProtocol(
    storedConfigurationId,
    storedProtocol,
    configuration,
  );
  if (!protocol) {
    await clearStoredAuthorization(configuration);
    return undefined;
  }
  if (storedProtocol !== protocol) {
    await LocalStorage.setItem(AUTH_PROTOCOL_KEY, protocol);
  }
  if (protocol === "legacy") {
    if (storedIssuer) await LocalStorage.removeItem(AUTH_ISSUER_KEY);
    return { tokens, protocol };
  }

  const issuer = resolveStoredCentralOAuthIssuer(storedIssuer, configuration);
  if (!issuer) {
    await clearStoredAuthorization(configuration);
    return undefined;
  }
  if (storedIssuer !== issuer) {
    await LocalStorage.setItem(AUTH_ISSUER_KEY, issuer);
  }
  return { tokens, protocol, issuer };
}

async function getClientInstallId(): Promise<string> {
  const existing = await LocalStorage.getItem<string>(INSTALL_ID_KEY);
  if (existing) return existing;
  const created = randomUUID();
  await LocalStorage.setItem(INSTALL_ID_KEY, created);
  return created;
}

function getRefreshRequestId(
  refreshToken: string,
  clientInstallId: string,
): string {
  return createHash("sha256")
    .update(`${clientInstallId}:${refreshToken}:jumpseat-raycast-refresh-v1`)
    .digest("hex");
}

async function refreshStoredAccessToken(
  configuration: JumpseatConfiguration,
  tokens: OAuth.TokenSet | undefined,
  protocol: JumpseatAuthProtocol,
  issuer?: string,
): Promise<string> {
  if (!tokens?.refreshToken) {
    await clearStoredAuthorization(configuration);
    throw new JumpseatAuthenticationError(
      "Your Jumpseat session has expired. Try again to sign in.",
    );
  }

  const clientInstallId = await getClientInstallId();
  const requestConfiguration =
    protocol === "central" && issuer
      ? { ...configuration, authBaseUrl: issuer }
      : configuration;
  const refreshRequest = buildRefreshRequest(
    requestConfiguration,
    tokens.refreshToken,
    protocol,
  );
  let response: Response;
  try {
    response = await fetch(refreshRequest.url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": refreshRequest.contentType,
        "X-Jumpseat-Client": "raycast",
        "X-Auth-Refresh-Reason": "proactive_request",
        "X-Auth-Refresh-Id": getRefreshRequestId(
          tokens.refreshToken,
          clientInstallId,
        ),
        "X-Client-Install-Id": clientInstallId,
      },
      body: refreshRequest.body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new JumpseatAuthenticationError(
      "Jumpseat could not refresh your session. Please try again shortly.",
    );
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const terminal = isDefinitiveOAuthTokenFailure(
      response.status,
      errorBody,
      protocol,
    );
    if (terminal) await clearStoredAuthorization(configuration);
    throw new JumpseatAuthenticationError(
      terminal
        ? "Your Jumpseat session has expired. Try again to sign in."
        : "Jumpseat could not refresh your session. Please try again shortly.",
    );
  }

  const refreshed = parseRefreshResponse(
    await response.json().catch(() => null),
  );
  if (!refreshed) {
    throw new JumpseatAuthenticationError(
      "Jumpseat could not refresh your session. Please try again shortly.",
    );
  }

  await jumpseatOAuthClient.setTokens({
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresIn: refreshed.expiresIn,
    scope: JUMPSEAT_OAUTH_SCOPE,
  });
  return refreshed.accessToken;
}

export async function refreshJumpseatAccessToken(
  configuration = getJumpseatConfiguration(),
): Promise<string> {
  const authorization = await getStoredAuthorization(configuration);
  return refreshStoredAccessToken(
    configuration,
    authorization?.tokens,
    authorization?.protocol ?? "central",
    authorization?.issuer,
  );
}

export async function getJumpseatAccessToken(
  configuration = getJumpseatConfiguration(),
): Promise<string> {
  const authorization = await getStoredAuthorization(configuration);
  if (!authorization?.tokens.accessToken) return authorize(configuration);
  if (authorization.tokens.isExpired()) {
    return refreshStoredAccessToken(
      configuration,
      authorization.tokens,
      authorization.protocol,
      authorization.issuer,
    );
  }
  return authorization.tokens.accessToken;
}

export async function clearJumpseatAuthorization(): Promise<void> {
  await clearStoredAuthorization(getJumpseatConfiguration(), { revoke: true });
}
