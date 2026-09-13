export const MCP_RESOURCE = "https://mcp.ticktick.com/";
export const RESOURCE_METADATA = "https://mcp.ticktick.com/.well-known/oauth-protected-resource";
export const AUTHORIZATION_SERVER = "https://ticktick.com/";
export const ISSUER = "https://ticktick.com";
export const AUTHORIZATION_METADATA = "https://ticktick.com/.well-known/oauth-authorization-server";

export const resourceMetadata = {
  resource: MCP_RESOURCE,
  authorization_servers: [AUTHORIZATION_SERVER],
  scopes_supported: ["tasks:read", "tasks:write"],
};

export const authorizationMetadata = {
  issuer: ISSUER,
  authorization_endpoint: "https://ticktick.com/oauth/authorize",
  token_endpoint: "https://api.ticktick.com/oauth/token",
  registration_endpoint: "https://api.ticktick.com/oauth/register",
  response_types_supported: ["code"],
  grant_types_supported: ["authorization_code"],
  token_endpoint_auth_methods_supported: ["none"],
  code_challenge_methods_supported: ["S256"],
};
