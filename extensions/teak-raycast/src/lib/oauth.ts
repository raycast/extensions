import { environment, LocalStorage, OAuth } from "@raycast/api";
import {
  type AuthDiscovery,
  createConnectAuthorizeUrl,
  disconnectConnectGrant,
  discoverAuthServer,
  requestConnectTokens,
  WORKOS_CONNECT_SCOPE,
} from "teak-sdk";
import { getApiBaseUrl } from "./constants";

export class TeakDiscoveryError extends Error {
  constructor() {
    super("Unable to reach Teak. Check your connection and retry.");
    this.name = "TeakDiscoveryError";
  }
}

class TeakSessionExpiredError extends Error {}
class TeakRefreshRevokedError extends TeakSessionExpiredError {}
class TeakRefreshUnavailableError extends Error {}
class TeakRefreshClientRejectedError extends Error {}
const reconnectAfterSignOut =
  "Sign Out before reconnecting, then wait 15 minutes for disconnect to finish.";
export class TeakSignOutRequiredError extends Error {
  constructor() {
    super(reconnectAfterSignOut);
  }
}

interface Provider {
  auth: AuthDiscovery;
  client: OAuth.PKCEClient;
}
const providers = new Map<string, Provider>();
const discovery = (forceRefresh = false) =>
  discoverAuthServer(getApiBaseUrl(), { forceRefresh });

interface SavedProvider {
  apiBaseUrl: string;
  clientId: string;
  issuer: string;
  providerId: string;
}
const connectionNamespace = ({
  apiBaseUrl,
  clientId,
  issuer,
}: Omit<SavedProvider, "providerId">) => `${apiBaseUrl}|${issuer}|${clientId}`;
const providerKey = (auth: AuthDiscovery) =>
  connectionNamespace({
    apiBaseUrl: getApiBaseUrl(),
    clientId: auth.clients.raycast,
    issuer: auth.issuer,
  });
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
  return {
    apiBaseUrl: getApiBaseUrl(),
    providerId: `teak:${providerKey(auth)}`,
    issuer: auth.issuer,
    clientId: auth.clients.raycast,
  };
}
function validateSavedProvider(raw: unknown): SavedProvider {
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
    !raw.clientId
  ) {
    throw new Error("Invalid saved Teak connection");
  }
  const record = {
    apiBaseUrl: raw.apiBaseUrl,
    providerId: raw.providerId,
    issuer: raw.issuer,
    clientId: raw.clientId,
  };
  const issuer = new URL(raw.issuer);
  if (
    raw.providerId !== `teak:${connectionNamespace(record)}` ||
    issuer.protocol !== "https:" ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash
  ) {
    throw new Error("Invalid saved Teak connection");
  }
  return record;
}
async function rememberProvider(auth: AuthDiscovery) {
  const record = savedProvider(auth);
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
  await discovery(true).catch(() => undefined);
}

async function sendGrant(
  provider: Provider,
  grant: Record<string, string>,
): Promise<{ accessToken: string } | { rejected: string }> {
  const result = await requestConnectTokens(provider.auth, {
    clientId: provider.auth.clients.raycast,
    grant,
    local: environment.isDevelopment,
  });
  if (result.ok) {
    const { accessToken, expiresIn, refreshToken } = result.tokens;
    await provider.client.setTokens({ accessToken, expiresIn, refreshToken });
    return { accessToken };
  }
  const { reason, status } = result;
  if (reason === "failed" && (status === 429 || status >= 500)) {
    throw new TeakDiscoveryError();
  }
  if (reason === "invalid_response") {
    throw new Error("Invalid Teak sign-in response.");
  }
  return { rejected: reason };
}

async function exchangeCode(
  provider: Provider,
  grant: Record<string, string>,
): Promise<string> {
  const result = await sendGrant(provider, {
    grant_type: "authorization_code",
    ...grant,
  });
  if ("accessToken" in result) {
    return result.accessToken;
  }
  throw new TeakSessionExpiredError("Teak sign-in expired. Sign in again.");
}

async function refresh(
  provider: Provider,
  refreshToken: string,
): Promise<string> {
  const result = await sendGrant(provider, {
    grant_type: "refresh_token",
    // Runtime credential from secure storage, not a hard-coded token.
    // nosemgrep: codacy.yaml.security.hard-coded-tokens
    refresh_token: refreshToken,
  });
  if ("accessToken" in result) {
    return result.accessToken;
  }
  if (result.rejected === "refresh_token_rejected") {
    throw new TeakRefreshRevokedError("Teak refresh credential was revoked.");
  }
  if (result.rejected === "client_rejected") {
    throw new TeakRefreshClientRejectedError("Teak client was rejected.");
  }
  throw new Error("Teak token request was rejected. Try again.");
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
  if (inFlightReauthorize) {
    return inFlightReauthorize;
  }
  if (!inFlightAuthorize) {
    inFlightAuthorize = authorize().finally(() => {
      inFlightAuthorize = null;
    });
  }
  return inFlightAuthorize;
}

async function authorize(): Promise<string> {
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
      scope: WORKOS_CONNECT_SCOPE,
    });
    const url = createConnectAuthorizeUrl(provider.auth, {
      clientId: provider.auth.clients.raycast,
      codeChallenge: request.codeChallenge,
      redirectUri: request.redirectURI,
      state: request.state,
    });
    const { authorizationCode } = await provider.client.authorize({
      url: url.href,
    });
    return await exchangeCode(provider, {
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
      const tokens = await provider.client.getTokens();
      if (tokens?.refreshToken) {
        return shareWithStoredTokenReaders(
          refresh(provider, tokens.refreshToken),
        );
      }
      if (tokens) {
        throw new TeakSignOutRequiredError();
      }
      return authorizeProvider(provider);
    })().finally(() => {
      inFlightReauthorize = null;
    });
  }
  return inFlightReauthorize;
}

function shareWithStoredTokenReaders(
  rotation: Promise<string>,
): Promise<string> {
  inFlightStoredToken = rotation;
  return rotation.finally(() => {
    if (inFlightStoredToken === rotation) {
      inFlightStoredToken = null;
    }
  });
}

export function signOutTeak(): Promise<SignOutResult> {
  if (!inFlightSignOut) {
    inFlightSignOut = revokeStoredSession().finally(() => {
      inFlightSignOut = null;
    });
  }
  return inFlightSignOut;
}

const grantIsUnrecoverable = (error: unknown) =>
  error instanceof TeakRefreshRevokedError ||
  error instanceof TeakRefreshUnavailableError ||
  error instanceof TeakRefreshClientRejectedError;

function readSavedConnections(entries: [string, unknown][]) {
  const records = new Map<string, SavedProvider>();
  const corruptKeys: string[] = [];
  for (const [key, value] of entries) {
    try {
      if (typeof value !== "string" || value.length > 8192) {
        throw new Error("Invalid saved Teak connection");
      }
      const record = validateSavedProvider(JSON.parse(value));
      if (key !== `${registryPrefix()}${record.providerId}`) {
        throw new Error("Saved connection namespace mismatch");
      }
      records.set(record.providerId, record);
    } catch {
      corruptKeys.push(key);
    }
  }
  return { corruptKeys, records: [...records.values()] };
}

async function refreshForSignOut(
  record: SavedProvider,
  refreshToken: string | undefined,
): Promise<string> {
  const provider = await getProvider(true);
  if (providerKey(provider.auth) !== connectionNamespace(record)) {
    throw new TeakRefreshUnavailableError();
  }
  if (!refreshToken) {
    throw new TeakRefreshUnavailableError();
  }
  return refresh(provider, refreshToken);
}

async function disconnectPreferringStoredAccessToken(
  record: SavedProvider,
  tokens: OAuth.TokenSet,
): Promise<SignOutResult> {
  const local = environment.isDevelopment;
  const refreshAccessToken = () =>
    refreshForSignOut(record, tokens.refreshToken);
  try {
    const result = tokens.accessToken
      ? await disconnectConnectGrant(getApiBaseUrl(), tokens.accessToken, {
          local,
          refreshAccessToken,
        })
      : await disconnectConnectGrant(
          getApiBaseUrl(),
          await refreshAccessToken(),
          { local },
        );
    if (result !== "disconnected") {
      throw new Error("Disconnect failed");
    }
    return "disconnected";
  } catch (error) {
    if (!grantIsUnrecoverable(error)) {
      throw new Error(
        "Your credentials are still saved. Check your connection and try Sign Out again.",
      );
    }
    return "local-only";
  }
}

async function revokeStoredSession(): Promise<SignOutResult> {
  await Promise.allSettled([
    inFlightAuthorize,
    inFlightStoredToken,
    inFlightReauthorize,
  ]);
  await getProvider();
  const entries = Object.entries(await LocalStorage.allItems()).filter(
    ([key]) => key.startsWith(registryPrefix()),
  );
  if (entries.length > 64) {
    throw new Error(
      "Too many saved Teak connections; Sign Out could not finish.",
    );
  }
  const { corruptKeys, records } = readSavedConnections(entries);
  for (const key of corruptKeys) {
    await LocalStorage.removeItem(key);
  }
  let localOnly = false;
  for (const record of records) {
    const client = nativeClient(record.providerId);
    const tokens = await client.getTokens();
    if (
      tokens &&
      (await disconnectPreferringStoredAccessToken(record, tokens)) ===
        "local-only"
    ) {
      localOnly = true;
    }
    await client.removeTokens();
    await LocalStorage.removeItem(`${registryPrefix()}${record.providerId}`);
  }
  if (corruptKeys.length > 0) {
    throw new Error(
      "Invalid connection metadata was removed. Known local credentials were cleared; unknown credentials were kept.",
    );
  }
  return localOnly ? "local-only" : "disconnected";
}

// The fresh access token of this deployment's only saved connection, read
// without discovery: it goes only to the deployment it was saved for, and a
// refresh or a 401 checks the provider again. Anything else, including two
// saved connections, is left to discovery.
async function freshSavedAccessToken(): Promise<string | null> {
  const entries = Object.entries(await LocalStorage.allItems()).filter(
    ([key]) => key.startsWith(registryPrefix()),
  );
  if (entries.length !== 1) {
    return null;
  }
  const { records } = readSavedConnections(entries);
  if (records.length !== 1) {
    return null;
  }
  const tokens = await nativeClient(records[0].providerId).getTokens();
  return tokens?.accessToken && !tokens.isExpired() ? tokens.accessToken : null;
}

export async function hasStoredTeakSession(): Promise<boolean> {
  if (inFlightSignOut) {
    return false;
  }
  if (await freshSavedAccessToken()) {
    return true;
  }
  const provider = await getProvider();
  return Boolean(await provider.client.getTokens());
}

export function getStoredTeakAccessToken(): Promise<string | null> {
  if (inFlightSignOut) {
    return Promise.resolve(null);
  }
  if (inFlightReauthorize) {
    return inFlightReauthorize;
  }
  if (!inFlightStoredToken) {
    inFlightStoredToken = resolveStoredTeakAccessToken().finally(() => {
      inFlightStoredToken = null;
    });
  }
  return inFlightStoredToken;
}

async function resolveStoredTeakAccessToken(): Promise<string | null> {
  const saved = await freshSavedAccessToken();
  if (saved) {
    return saved;
  }
  const provider = await getProvider();
  const tokens = await provider.client.getTokens();
  if (!tokens) {
    return null;
  }
  if (tokens.accessToken && !tokens.isExpired()) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    throw new TeakSignOutRequiredError();
  }
  try {
    return await refresh(provider, tokens.refreshToken);
  } catch (error) {
    await refetchAfterFailure();
    if (!tokens.accessToken && error instanceof TeakRefreshRevokedError) {
      throw new TeakSignOutRequiredError();
    }
    if (error instanceof TeakSessionExpiredError) {
      return null;
    }
    throw new TeakDiscoveryError();
  }
}
