// Twelfth's only external surface is the read-only MCP endpoint: the app's
// /api/workspace routes take a browser session cookie, not a token. So every
// read here is an MCP `tools/call`, authenticated by an OAuth token or a
// workspace key, exactly as Claude or Cursor would connect.
export const API_ORIGIN = "https://api.twelfth.ai";
export const WEB_ORIGIN = "https://twelfth.ai";

export const MCP_URL = `${API_ORIGIN}/mcp`;
export const OAUTH = {
  authorize: `${API_ORIGIN}/api/auth/oauth2/authorize`,
  token: `${API_ORIGIN}/api/auth/oauth2/token`,
  register: `${API_ORIGIN}/api/auth/oauth2/register`,
  // Tokens are audience-bound to the MCP resource; without `resource` the
  // server issues an opaque token the MCP endpoint will not accept.
  resource: MCP_URL,
  // offline_access is what earns a refresh token. Access tokens last a day.
  scope: "openid profile email offline_access",
  // The Raycast web redirect: the server only registers https redirect URIs
  // for public clients, so the app-scheme redirects are refused.
  redirectUri: "https://raycast.com/redirect?packageName=Extension",
};

export function appUrl(path: string): string {
  return new URL(path, WEB_ORIGIN).toString();
}

/** A new Twelfth chat with the composer filled in (the app does not send it). */
export function askUrl(question?: string): string {
  const q = question?.trim();
  return appUrl(q ? `/app/chat/new?q=${encodeURIComponent(q)}` : "/app/chat/new");
}
