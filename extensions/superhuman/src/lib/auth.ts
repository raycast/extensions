import { LocalStorage, OAuth } from "@raycast/api";

export const MCP_URL = "https://mcp.mail.superhuman.com/mcp";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Superhuman",
  providerIcon: "extension-icon.png",
  providerId: "superhuman-mcp",
  description: "Connect your Superhuman account.\n\nRaycast will open Superhuman in your browser to authorize access.",
});

interface OAuthServerMetadata {
  issuer?: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  code_challenge_methods_supported?: string[];
}

interface ClientRegistration {
  client_id: string;
  client_secret?: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

interface ProtectedResourceMetadata {
  resource: string;
  authorization_servers?: string[];
  scopes_supported?: string[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function discoverMetadata(): Promise<{ as: OAuthServerMetadata; resourceScopes?: string[] }> {
  // RFC 9728: the protected resource advertises its authorization server(s).
  const prmUrl = new URL("/.well-known/oauth-protected-resource", MCP_URL).toString();
  let prm: ProtectedResourceMetadata;
  try {
    prm = await fetchJson<ProtectedResourceMetadata>(prmUrl);
  } catch (err) {
    throw new Error(
      `Unable to read Superhuman protected-resource metadata at ${prmUrl}. ${err instanceof Error ? err.message : ""}`,
    );
  }
  const authServer = prm.authorization_servers?.[0];
  if (!authServer)
    throw new Error(`Superhuman protected-resource metadata did not advertise an authorization_servers entry.`);

  // Try OAuth Authorization Server Metadata first, then OIDC configuration as fallback.
  const asCandidates = [
    new URL("/.well-known/oauth-authorization-server", authServer).toString(),
    new URL("/.well-known/openid-configuration", authServer).toString(),
  ];
  let lastError: unknown;
  for (const url of asCandidates) {
    try {
      const data = await fetchJson<OAuthServerMetadata>(url);
      if (data.authorization_endpoint && data.token_endpoint) {
        return { as: data, resourceScopes: prm.scopes_supported };
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(
    `Unable to discover Superhuman authorization-server metadata at ${authServer}. ${lastError instanceof Error ? lastError.message : ""}`,
  );
}

async function registerClient(meta: OAuthServerMetadata, redirectUri: string): Promise<ClientRegistration> {
  if (!meta.registration_endpoint) {
    throw new Error(
      "Superhuman OAuth server does not expose dynamic client registration. Ask Superhuman to allowlist Raycast as an OAuth client, then update src/lib/auth.ts with the issued client_id.",
    );
  }
  const res = await fetch(meta.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Raycast",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      application_type: "native",
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Client registration failed: ${res.status} ${text}`);
  }
  return (await res.json()) as ClientRegistration;
}

async function exchangeCode(
  meta: OAuthServerMetadata,
  registration: ClientRegistration,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: registration.client_id,
    code_verifier: codeVerifier,
  });
  if (registration.client_secret) body.set("client_secret", registration.client_secret);
  const res = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

async function refreshTokens(
  meta: OAuthServerMetadata,
  registration: ClientRegistration,
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: registration.client_id,
  });
  if (registration.client_secret) body.set("client_secret", registration.client_secret);
  const res = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

// Auth-server metadata + DCR result are sidecar state for refresh; persist them
// in LocalStorage so the OAuth `scope` field stays accurate to what was granted.
const SIDECAR_KEY = "superhuman.oauth.sidecar.v1";

interface OAuthSidecar {
  meta: OAuthServerMetadata;
  registration: ClientRegistration;
}

async function saveSidecar(sidecar: OAuthSidecar): Promise<void> {
  await LocalStorage.setItem(SIDECAR_KEY, JSON.stringify(sidecar));
}

async function loadSidecar(): Promise<OAuthSidecar | null> {
  const raw = await LocalStorage.getItem<string>(SIDECAR_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthSidecar;
    if (parsed?.meta?.token_endpoint && parsed?.registration?.client_id) return parsed;
  } catch {
    // Corrupt or pre-migration payload; treat as missing.
  }
  return null;
}

async function clearSidecar(): Promise<void> {
  await LocalStorage.removeItem(SIDECAR_KEY);
}

function pickScopes(asSupported?: string[], resourceSupported?: string[]): string {
  // Required for an OIDC-issued token (Superhuman gates the MCP on having OIDC identity).
  const required = ["openid", "offline_access"];
  // Preferred extras when advertised.
  const preferred = ["email", "profile"];
  const advertised = new Set<string>([...(asSupported ?? []), ...(resourceSupported ?? [])]);
  const scopes = new Set<string>();
  for (const s of required) if (advertised.size === 0 || advertised.has(s)) scopes.add(s);
  for (const s of preferred) if (advertised.has(s)) scopes.add(s);
  return Array.from(scopes).join(" ");
}

async function authorize(): Promise<string> {
  const { as: meta, resourceScopes } = await discoverMetadata();
  const scope = pickScopes(meta.scopes_supported, resourceScopes);

  // Probe the host (stable Raycast vs Raycast Beta) for the redirect URI it will use,
  // so we can register the OAuth client with the exact URI the auth server will see.
  const probe = await client.authorizationRequest({
    endpoint: meta.authorization_endpoint,
    clientId: "probe",
    scope,
  });
  const redirectUri = probe.redirectURI;

  const registration = await registerClient(meta, redirectUri);

  const authRequest = await client.authorizationRequest({
    endpoint: meta.authorization_endpoint,
    clientId: registration.client_id,
    scope,
    extraParameters: { prompt: "consent" },
  });
  const { authorizationCode } = await client.authorize(authRequest);
  const tokens = await exchangeCode(meta, registration, authorizationCode, authRequest.codeVerifier, redirectUri);

  await saveSidecar({ meta, registration });
  await client.setTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scope: tokens.scope ?? scope,
  });
  return tokens.access_token;
}

export async function getAccessToken(): Promise<string> {
  const tokenSet = await client.getTokens();
  if (!tokenSet) return authorize();

  const sidecar = await loadSidecar();
  if (!sidecar) return authorize();

  if (!tokenSet.isExpired() && tokenSet.accessToken) return tokenSet.accessToken;

  if (tokenSet.refreshToken) {
    try {
      const refreshed = await refreshTokens(sidecar.meta, sidecar.registration, tokenSet.refreshToken);
      await client.setTokens({
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token ?? tokenSet.refreshToken,
        expiresIn: refreshed.expires_in,
        scope: refreshed.scope ?? tokenSet.scope,
      });
      return refreshed.access_token;
    } catch {
      return authorize();
    }
  }
  return authorize();
}

export async function signOut(): Promise<void> {
  await client.removeTokens();
  await clearSidecar();
}
