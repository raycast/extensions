import { environment, LocalStorage, OAuth } from "@raycast/api";
import { type AuthDiscovery, discoverAuthServer } from "teak-sdk";
import { getApiBaseUrl, getAppBaseUrl } from "./constants";

export class TeakDiscoveryError extends Error {
  constructor() {
    super("Unable to reach Teak. Check your connection and retry.");
    this.name = "TeakDiscoveryError";
  }
}

class TeakSessionExpiredError extends Error {}
class TeakRefreshRevokedError extends TeakSessionExpiredError {}
class TeakHistoricalConnectionError extends Error {}
class TeakRefreshClientRejectedError extends Error {}

interface Provider {
  auth: AuthDiscovery;
  client: OAuth.PKCEClient;
}
const providers = new Map<string, Provider>();
const discovery = (forceRefresh = false) =>
  discoverAuthServer(getApiBaseUrl(), {
    forceRefresh,
    ...(environment.isDevelopment ? { localIssuer: getAppBaseUrl() } : {}),
  });
const providerKey = (auth: AuthDiscovery) =>
  `${getApiBaseUrl()}|${auth.issuer}|${auth.clients.raycast}`;
const audience = (auth: AuthDiscovery): Record<string, string> =>
  auth.primary === "workos"
    ? { resource: new URL("/api", auth.resource).href }
    : {};

interface SavedProvider {
  apiBaseUrl: string;
  clientId: string;
  issuer: string;
  providerId: string;
  revocationEndpoint?: string;
}
const registryPrefix = () =>
  `teak.oauth.provider:${encodeURIComponent(getApiBaseUrl())}:`;
const nativeClient = (providerId: string) =>
  new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Teak",
    providerId,
    providerIcon: "icon.png",
    description: "Connect your Teak account to save and search cards.",
  });
function savedProvider(auth: AuthDiscovery): SavedProvider {
  const legacy =
    !environment.isDevelopment &&
    auth.primary === "betterauth" &&
    auth.issuer === "https://app.teakvault.com" &&
    auth.clients.raycast === "teak-raycast";
  return {
    apiBaseUrl: getApiBaseUrl(),
    providerId: legacy ? "teak" : `teak:${providerKey(auth)}`,
    issuer: auth.issuer,
    clientId: auth.clients.raycast,
    revocationEndpoint:
      auth.primary === "betterauth" ? auth.revocationEndpoint : undefined,
  };
}
function validateSavedProvider(
  raw: unknown,
  current: AuthDiscovery,
): SavedProvider {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("apiBaseUrl" in raw) ||
    raw.apiBaseUrl !== getApiBaseUrl() ||
    !("providerId" in raw) ||
    typeof raw.providerId !== "string" ||
    !("issuer" in raw) ||
    typeof raw.issuer !== "string" ||
    !("clientId" in raw) ||
    typeof raw.clientId !== "string" ||
    !raw.clientId ||
    ("revocationEndpoint" in raw && typeof raw.revocationEndpoint !== "string")
  ) {
    throw new Error("Invalid saved Teak connection");
  }
  const issuer = new URL(raw.issuer);
  const endpoint =
    "revocationEndpoint" in raw
      ? new URL(String(raw.revocationEndpoint))
      : undefined;
  const legacy = raw.providerId === "teak";
  const expected = legacy
    ? "teak"
    : `teak:${raw.apiBaseUrl}|${raw.issuer}|${raw.clientId}`;
  const knownWorkos = environment.isDevelopment
    ? {
        apiBaseUrl: "https://reminiscent-kangaroo-59.convex.site/v1",
        issuer:
          "https://optimistic-metaphor-12-reminiscent-kangaroo-59.authkit.app",
        clientId: "client_01M46CY5JTV80SYC820KWEGE3Z",
      }
    : {
        apiBaseUrl: "https://teakvault.com/api/v1",
        issuer: "https://scholarly-hay-77.authkit.app",
        clientId: "client_01M47GV3CYKFW0H78W0XYKGTM5",
      };
  const workos = raw.clientId.startsWith("client_");
  const currentWorkos =
    current.primary === "workos" &&
    raw.issuer === current.issuer &&
    raw.clientId === current.clients.raycast;
  const historicalWorkos =
    raw.apiBaseUrl === knownWorkos.apiBaseUrl &&
    raw.issuer === knownWorkos.issuer &&
    raw.clientId === knownWorkos.clientId;
  if (
    workos &&
    (!(currentWorkos || historicalWorkos) || endpoint !== undefined)
  ) {
    throw new Error("Saved WorkOS connection does not match this deployment");
  }
  if (
    !workos &&
    (raw.clientId !== "teak-raycast" ||
      raw.issuer !== getAppBaseUrl() ||
      endpoint?.href !==
        `${getApiBaseUrl().replace(/\/v1$/, "")}/api/oauth/revoke`)
  ) {
    throw new Error(
      "Saved Better Auth connection does not match this deployment",
    );
  }

  if (
    raw.providerId !== expected ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash ||
    endpoint?.username ||
    endpoint?.password ||
    endpoint?.search ||
    endpoint?.hash ||
    (legacy &&
      (environment.isDevelopment ||
        raw.issuer !== "https://app.teakvault.com" ||
        raw.clientId !== "teak-raycast")) ||
    (issuer.protocol !== "https:" &&
      !(
        environment.isDevelopment &&
        issuer.origin === new URL(getAppBaseUrl()).origin
      )) ||
    (endpoint &&
      endpoint.origin !== issuer.origin &&
      endpoint.origin !== new URL(getApiBaseUrl()).origin)
  ) {
    throw new Error("Invalid saved Teak connection");
  }
  // Endpoint origin and native namespace share the persisted issuer/client pin:
  // tampering with that pin cannot retrieve another issuer's Keychain tokens.
  return {
    apiBaseUrl: raw.apiBaseUrl,
    providerId: raw.providerId,
    issuer: raw.issuer,
    clientId: raw.clientId,
    revocationEndpoint: endpoint?.href,
  };
}
async function rememberProvider(auth: AuthDiscovery) {
  const record = savedProvider(auth);
  // AuthKit Connect disconnects through Teak, never an inferred provider URL.
  await LocalStorage.setItem(
    `${registryPrefix()}${record.providerId}`,
    JSON.stringify(record),
  );
}
async function getProvider(forceRefresh = false): Promise<Provider> {
  let auth: AuthDiscovery;
  try {
    auth = await discovery(forceRefresh);
  } catch {
    throw new TeakDiscoveryError();
  }
  const key = providerKey(auth);
  const cached = providers.get(key);
  if (cached) {
    cached.auth = auth;
    await rememberProvider(auth);
    return cached;
  }
  const provider = {
    auth,
    client: nativeClient(savedProvider(auth).providerId),
  };
  await rememberProvider(auth);
  providers.set(key, provider);
  return provider;
}

async function refetchAfterFailure() {
  try {
    await discovery(true);
  } catch {
    // Keep the original failure; failed discovery never selects a fallback.
  }
}

async function exchange(
  provider: Provider,
  params: Record<string, string>,
  previousRefresh?: string,
) {
  const response = await fetch(provider.auth.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: provider.auth.clients.raycast,
      ...audience(provider.auth),
      ...params,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 429 || response.status >= 500) {
    throw new TeakDiscoveryError();
  }
  // Uncertain refresh failures must not trigger browser auth over saved tokens.
  const bodyError = (message: string) =>
    !response.ok && params.grant_type !== "refresh_token"
      ? new TeakSessionExpiredError("Teak sign-in expired. Sign in again.")
      : new Error(message);
  const reader = response.body?.getReader();
  if (!reader) {
    throw bodyError("Invalid Teak sign-in response.");
  }
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }
      bytes += chunk.value.byteLength;
      if (bytes > 64 * 1024) {
        await reader.cancel();
        throw bodyError("Teak sign-in response is too large.");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text + decoder.decode());
  } catch {
    throw bodyError("Invalid Teak sign-in response.");
  }
  if (!response.ok) {
    if (
      params.grant_type === "refresh_token" &&
      (response.status === 400 || response.status === 401) &&
      raw !== null &&
      typeof raw === "object" &&
      "error" in raw
    ) {
      if (raw.error === "invalid_grant") {
        throw new TeakRefreshRevokedError(
          "Teak refresh credential was revoked.",
        );
      }
      if (
        raw.error === "invalid_client" ||
        raw.error === "unauthorized_client"
      ) {
        // The client was rejected, not necessarily its remote grant revoked.
        // Only explicit Sign Out may forget this local credential.
        throw new TeakRefreshClientRejectedError("Teak client was rejected.");
      }
    }
    throw bodyError("Teak token request was rejected. Try again.");
  }
  if (
    !raw ||
    typeof raw !== "object" ||
    !("access_token" in raw) ||
    typeof raw.access_token !== "string" ||
    !raw.access_token ||
    !("expires_in" in raw) ||
    typeof raw.expires_in !== "number" ||
    !Number.isFinite(raw.expires_in) ||
    raw.expires_in <= 0 ||
    ("refresh_token" in raw &&
      (typeof raw.refresh_token !== "string" || !raw.refresh_token))
  ) {
    throw new Error("Invalid Teak sign-in response.");
  }
  const refreshToken =
    "refresh_token" in raw ? String(raw.refresh_token) : previousRefresh;
  await provider.client.setTokens({
    accessToken: raw.access_token,
    expiresIn: raw.expires_in,
    refreshToken,
  });
  return raw.access_token;
}

let inFlightAuthorize: Promise<string> | null = null;
let inFlightStoredToken: Promise<string | null> | null = null;
export type SignOutResult = "disconnected" | "local-only";
let inFlightSignOut: Promise<SignOutResult> | null = null;
let inFlightReauthorize: Promise<string> | null = null;

export function authorizeTeak(): Promise<string> {
  if (inFlightSignOut) {
    return Promise.reject(
      new Error("Teak sign-out is in progress. Try again."),
    );
  }
  if (inFlightReauthorize) return inFlightReauthorize;
  if (!inFlightAuthorize) {
    inFlightAuthorize = authorize().finally(() => {
      inFlightAuthorize = null;
    });
  }
  return inFlightAuthorize;
}

async function authorize(): Promise<string> {
  // The same refresh guard is used by background and interactive commands.
  const stored = await getStoredTeakAccessToken();
  if (stored) {
    return stored;
  }
  return authorizeProvider(await getProvider());
}

async function authorizeProvider(provider: Provider): Promise<string> {
  try {
    const request = await provider.client.authorizationRequest({
      endpoint: provider.auth.authorizationEndpoint,
      clientId: provider.auth.clients.raycast,
      scope:
        provider.auth.primary === "workos"
          ? "openid profile email offline_access"
          : "profile email offline_access",
      extraParameters: audience(provider.auth),
    });
    const { authorizationCode } = await provider.client.authorize(request);
    return await exchange(provider, {
      grant_type: "authorization_code",
      code: authorizationCode,
      code_verifier: request.codeVerifier,
      redirect_uri: request.redirectURI,
    });
  } catch (error) {
    await refetchAfterFailure();
    throw error;
  }
}

export function reauthorizeTeak(): Promise<string> {
  if (inFlightSignOut) {
    return Promise.reject(
      new Error("Teak sign-out is in progress. Try again."),
    );
  }
  if (!inFlightReauthorize) {
    inFlightReauthorize = (async () => {
      await Promise.allSettled([inFlightAuthorize, inFlightStoredToken]);
      const provider = await getProvider(true);
      if (provider.auth.primary === "workos") {
        const tokens = await provider.client.getTokens();
        if (tokens?.refreshToken) {
          const renewed = exchange(
            provider,
            { grant_type: "refresh_token", refresh_token: tokens.refreshToken },
            tokens.refreshToken,
          );
          // Background readers join this rotation instead of replaying the old
          // refresh token while reauthorization is in flight.
          inFlightStoredToken = renewed;
          try {
            return await renewed;
          } finally {
            if (inFlightStoredToken === renewed) inFlightStoredToken = null;
          }
        }
        if (tokens) {
          throw new Error(
            "Sign Out before reconnecting, then wait five minutes for disconnect to finish.",
          );
        }
      }
      await provider.client.removeTokens();
      return authorizeProvider(provider);
    })().finally(() => {
      inFlightReauthorize = null;
    });
  }
  return inFlightReauthorize;
}

export function signOutTeak(): Promise<SignOutResult> {
  if (!inFlightSignOut) {
    inFlightSignOut = revokeStoredSession().finally(() => {
      inFlightSignOut = null;
    });
  }
  return inFlightSignOut;
}

async function revokeStoredSession(): Promise<SignOutResult> {
  await Promise.allSettled([
    inFlightAuthorize,
    inFlightStoredToken,
    inFlightReauthorize,
  ]);
  const current = await getProvider();
  const saved = await LocalStorage.allItems();
  const records = new Map<string, SavedProvider>();
  if (!environment.isDevelopment) {
    records.set("teak", {
      apiBaseUrl: getApiBaseUrl(),
      providerId: "teak",
      issuer: "https://app.teakvault.com",
      clientId: "teak-raycast",
      revocationEndpoint: "https://teakvault.com/api/api/oauth/revoke",
    });
  }
  const entries = Object.entries(saved).filter(([key]) =>
    key.startsWith(registryPrefix()),
  );
  if (entries.length > 64) {
    throw new Error(
      "Too many saved Teak connections; Sign Out could not finish.",
    );
  }
  let invalidMetadata = false;
  let localOnly = false;
  for (const [key, value] of entries) {
    try {
      if (typeof value !== "string" || value.length > 8192) {
        throw new Error("Invalid saved Teak connection");
      }
      const record = validateSavedProvider(JSON.parse(value), current.auth);
      if (key !== `${registryPrefix()}${record.providerId}`) {
        throw new Error("Saved connection namespace mismatch");
      }
      records.set(record.providerId, record);
    } catch {
      // Only discard the corrupt metadata. Never trust its namespace or endpoint
      // enough to read/delete Keychain credentials or contact a remote server.
      await LocalStorage.removeItem(key);
      invalidMetadata = true;
    }
  }
  for (const record of records.values()) {
    const client = nativeClient(record.providerId);
    const tokens = await client.getTokens();
    const workos = record.clientId.startsWith("client_");
    const token = workos
      ? tokens?.accessToken
      : tokens?.refreshToken || tokens?.accessToken;
    if (tokens && !token) {
      throw new Error("Your credentials are still saved. Try Sign Out again.");
    }
    if (token) {
      try {
        // Try an old token first so a completed disconnect can recover without
        // refreshing a grant the provider has already revoked.
        const endpoint = workos
          ? `${getApiBaseUrl()}/oauth/disconnect`
          : record.revocationEndpoint;
        if (!endpoint) {
          throw new Error("Revocation is unavailable");
        }
        const disconnect = (accessToken: string) =>
          fetch(endpoint, {
            method: "POST",
            headers: workos
              ? { Authorization: `Bearer ${accessToken}` }
              : { "Content-Type": "application/x-www-form-urlencoded" },
            ...(workos
              ? {}
              : {
                  body: new URLSearchParams({
                    client_id: record.clientId,
                    token,
                  }),
                }),
            redirect: "error",
            signal: AbortSignal.timeout(10_000),
          });
        let response = await disconnect(token);
        if (workos && response.status === 401) {
          const provider = await getProvider(true);
          if (
            providerKey(provider.auth) !==
            `${record.apiBaseUrl}|${record.issuer}|${record.clientId}`
          ) {
            // This exact historical namespace is trusted, but refreshing it via
            // the new provider would disclose credentials. Explicit Sign Out
            // may clear it locally without claiming provider revocation.
            throw new TeakHistoricalConnectionError();
          }
          if (!tokens?.refreshToken) {
            throw new Error("Refresh credential is unavailable");
          }
          const renewed = await exchange(
            provider,
            {
              grant_type: "refresh_token",
              // Runtime credential from secure storage, not a hard-coded token.
              // nosemgrep: codacy.yaml.security.hard-coded-tokens
              refresh_token: tokens.refreshToken,
            },
            tokens.refreshToken,
          );
          // exchange atomically stores rotated tokens before retrying. Sign-out
          // blocks new readers and has drained all in-flight refreshes.
          response = await disconnect(renewed);
        }
        if (workos ? response.status !== 204 : !response.ok) {
          throw new Error("Revocation failed");
        }
      } catch (error) {
        // A dead refresh grant, rejected client or historical-provider mismatch
        // permits explicit local clearing. None claims remote revocation;
        // uncertain failures retain their credentials.
        if (
          !(
            workos &&
            (error instanceof TeakRefreshRevokedError ||
              error instanceof TeakHistoricalConnectionError ||
              error instanceof TeakRefreshClientRejectedError)
          )
        ) {
          throw new Error(
            "Your credentials are still saved. Check your connection and try Sign Out again.",
          );
        }
        localOnly = true;
      }
    }
    await client.removeTokens();
    await LocalStorage.removeItem(`${registryPrefix()}${record.providerId}`);
  }
  if (invalidMetadata) {
    throw new Error(
      "Invalid connection metadata was removed. Known local credentials were cleared; unknown credentials were kept.",
    );
  }
  return localOnly ? "local-only" : "disconnected";
}

export async function hasStoredTeakSession(): Promise<boolean> {
  if (inFlightSignOut) {
    return false;
  }
  const provider = await getProvider();
  const tokens = await provider.client.getTokens();
  return Boolean(
    tokens?.accessToken && (!tokens.isExpired() || tokens.refreshToken),
  );
}

export function getStoredTeakAccessToken(): Promise<string | null> {
  if (inFlightSignOut) {
    return Promise.resolve(null);
  }
  if (inFlightReauthorize) return inFlightReauthorize;
  if (!inFlightStoredToken) {
    inFlightStoredToken = resolveStoredTeakAccessToken().finally(() => {
      inFlightStoredToken = null;
    });
  }
  return inFlightStoredToken;
}

async function resolveStoredTeakAccessToken(): Promise<string | null> {
  const provider = await getProvider();
  const tokens = await provider.client.getTokens();
  if (!tokens?.accessToken) {
    return null;
  }
  if (!tokens.isExpired()) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    return null;
  }
  try {
    return await exchange(
      provider,
      { grant_type: "refresh_token", refresh_token: tokens.refreshToken },
      tokens.refreshToken,
    );
  } catch (error) {
    await refetchAfterFailure();
    if (error instanceof TeakSessionExpiredError) {
      return null;
    }
    throw new TeakDiscoveryError();
  }
}
