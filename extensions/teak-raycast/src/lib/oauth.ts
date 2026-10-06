import { environment, OAuth } from "@raycast/api";
import { type AuthDiscovery, discoverAuthServer } from "teak-sdk";
import { getApiBaseUrl, getAppBaseUrl } from "./constants";

export class TeakDiscoveryError extends Error {
  constructor() {
    super("Unable to reach Teak. Check your connection and retry.");
    this.name = "TeakDiscoveryError";
  }
}

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
    return cached;
  }
  // Preserve pre-migration production credentials; dev and WorkOS never share
  // their native credential namespace with another deployment or provider.
  const legacy =
    !environment.isDevelopment &&
    auth.primary === "betterauth" &&
    auth.issuer === "https://app.teakvault.com" &&
    auth.clients.raycast === "teak-raycast";
  const provider = {
    auth,
    client: new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.Web,
      providerName: "Teak",
      providerId: legacy ? "teak" : `teak:${key}`,
      providerIcon: "icon.png",
      description: "Connect your Teak account to save and search cards.",
    }),
  };
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
  if (!response.ok) {
    throw new Error("Teak sign-in expired. Sign in again.");
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Invalid Teak sign-in response.");
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
        throw new Error("Teak sign-in response is too large.");
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
    throw new Error("Invalid Teak sign-in response.");
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
let inFlightSignOut: Promise<void> | null = null;
let inFlightReauthorize: Promise<string> | null = null;

export function authorizeTeak(): Promise<string> {
  if (inFlightSignOut) {
    return Promise.reject(
      new Error("Teak sign-out is in progress. Try again."),
    );
  }
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
  const provider = await getProvider();
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
      const provider = await getProvider();
      await getProvider(true);
      await provider.client.removeTokens();
      return authorizeTeak();
    })().finally(() => {
      inFlightReauthorize = null;
    });
  }
  return inFlightReauthorize;
}

export async function refreshTeakAuthConfiguration(): Promise<void> {
  await refetchAfterFailure();
}

export function signOutTeak(): Promise<void> {
  if (!inFlightSignOut) {
    inFlightSignOut = revokeStoredSession().finally(() => {
      inFlightSignOut = null;
    });
  }
  return inFlightSignOut;
}

async function revokeStoredSession(): Promise<void> {
  await Promise.allSettled([
    inFlightAuthorize,
    inFlightStoredToken,
    inFlightReauthorize,
  ]);
  // Revoke every namespace encountered by this command, including credentials
  // from the previous provider when a flip occurred during a failed refresh.
  await getProvider();
  for (const provider of providers.values()) {
    const tokens = await provider.client.getTokens();
    const token = tokens?.refreshToken || tokens?.accessToken;
    if (token) {
      try {
        if (!provider.auth.revocationEndpoint) {
          throw new Error("Revocation is unavailable");
        }
        const response = await fetch(provider.auth.revocationEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: provider.auth.clients.raycast,
            token,
          }),
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) {
          throw new Error("Revocation failed");
        }
      } catch {
        await refetchAfterFailure();
        throw new Error(
          "Your credentials are still saved. Check your connection and try Sign Out again.",
        );
      }
    }
    await provider.client.removeTokens();
  }
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
  } catch {
    await refetchAfterFailure();
    return null;
  }
}
