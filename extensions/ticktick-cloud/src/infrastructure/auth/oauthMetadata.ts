import { ProtocolError } from "../../domain/errors";

export const MCP_RESOURCE = "https://mcp.ticktick.com/";
export const RESOURCE_METADATA = "https://mcp.ticktick.com/.well-known/oauth-protected-resource";
export const REQUIRED_SCOPES = ["tasks:read", "tasks:write"] as const;
export const AUTHORIZATION_SERVER = "https://ticktick.com/";
export const OAUTH_ISSUER = "https://ticktick.com";
export const AUTHORIZATION_ENDPOINT = "https://ticktick.com/oauth/authorize";
export const TOKEN_ENDPOINT = "https://api.ticktick.com/oauth/token";
export const REGISTRATION_ENDPOINT = "https://api.ticktick.com/oauth/register";

export interface OAuthMetadata {
  resource: typeof MCP_RESOURCE;
  authorizationServer: typeof AUTHORIZATION_SERVER;
  authorizationEndpoint: typeof AUTHORIZATION_ENDPOINT;
  tokenEndpoint: typeof TOKEN_ENDPOINT;
  registrationEndpoint: typeof REGISTRATION_ENDPOINT;
}

type JsonObject = Record<string, unknown>;

function protocolFailure(): ProtocolError {
  return new ProtocolError("TickTick returned unsupported OAuth metadata.");
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string") ? value : undefined;
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function authorizationMetadataUrl(server: string): string {
  if (server !== AUTHORIZATION_SERVER) throw protocolFailure();
  return "https://ticktick.com/.well-known/oauth-authorization-server";
}

async function getJson(fetchImpl: typeof fetch, url: string): Promise<JsonObject> {
  let response: Response;
  try {
    response = await fetchImpl(url, { redirect: "error" });
  } catch {
    throw protocolFailure();
  }
  if (!response.ok || response.redirected) throw protocolFailure();
  try {
    const parsed: unknown = await response.json();
    if (!isObject(parsed)) throw protocolFailure();
    return parsed;
  } catch (error) {
    if (error instanceof ProtocolError) throw error;
    throw protocolFailure();
  }
}

export async function discoverOAuthMetadata(fetchImpl: typeof fetch = fetch): Promise<OAuthMetadata> {
  const resource = await getJson(fetchImpl, RESOURCE_METADATA);
  const authorizationServers = stringArray(resource.authorization_servers);
  const scopes = stringArray(resource.scopes_supported);
  if (
    resource.resource !== MCP_RESOURCE ||
    authorizationServers?.length !== 1 ||
    authorizationServers[0] !== AUTHORIZATION_SERVER ||
    !isHttpsUrl(authorizationServers[0]) ||
    !scopes ||
    !REQUIRED_SCOPES.every((scope) => scopes.includes(scope))
  )
    throw protocolFailure();

  const authorization = await getJson(fetchImpl, authorizationMetadataUrl(authorizationServers[0]));
  const responses = stringArray(authorization.response_types_supported);
  const grants = stringArray(authorization.grant_types_supported);
  const authentication = stringArray(authorization.token_endpoint_auth_methods_supported);
  const pkce = stringArray(authorization.code_challenge_methods_supported);
  if (
    authorization.issuer !== OAUTH_ISSUER ||
    authorization.authorization_endpoint !== AUTHORIZATION_ENDPOINT ||
    authorization.token_endpoint !== TOKEN_ENDPOINT ||
    authorization.registration_endpoint !== REGISTRATION_ENDPOINT ||
    !responses?.includes("code") ||
    !grants?.includes("authorization_code") ||
    !authentication?.includes("none") ||
    !pkce?.includes("S256")
  )
    throw protocolFailure();

  return {
    resource: MCP_RESOURCE,
    authorizationServer: AUTHORIZATION_SERVER,
    authorizationEndpoint: AUTHORIZATION_ENDPOINT,
    tokenEndpoint: TOKEN_ENDPOINT,
    registrationEndpoint: REGISTRATION_ENDPOINT,
  };
}
