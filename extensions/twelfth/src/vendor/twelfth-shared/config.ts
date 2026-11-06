// Twelfth's external surface is the MCP endpoint: the app's /api/workspace
// routes take a browser session cookie, not a token. So every read here is an
// MCP `tools/call`, authenticated by an OAuth token or a workspace key, exactly
// as Claude or Cursor would connect. The one exception is chat (chat.ts), which
// a first-party client's OAuth connection reaches at its own route.
export const API_ORIGIN = "https://api.twelfth.ai";
export const WEB_ORIGIN = "https://twelfth.ai";

export const MCP_URL = `${API_ORIGIN}/mcp`;
export const MCP_PROTOCOL_VERSION = "2025-06-18";

/** OAuth scope: offline_access is what earns a refresh token. Access tokens last a day. */
export const OAUTH_SCOPE = "openid profile email offline_access";

export type Endpoints = {
  mcp: string;
  authorize: string;
  token: string;
  register: string;
  /**
   * Tokens are audience-bound to the MCP resource; without `resource` the
   * server issues an opaque token the MCP endpoint will not accept. Always the
   * public MCP URL, even when requests travel through a dev proxy.
   */
  resource: string;
};

/**
 * Where a client sends its requests. `fetchBase` is the origin the fetches
 * (MCP, token, registration) go to; a local dev server proxies them so the
 * browser sees one origin. The authorize page is a navigation, not a fetch, so
 * it always goes to Twelfth itself.
 */
export function endpoints(fetchBase: string = API_ORIGIN): Endpoints {
  return {
    mcp: `${fetchBase}/mcp`,
    authorize: `${API_ORIGIN}/api/auth/oauth2/authorize`,
    token: `${fetchBase}/api/auth/oauth2/token`,
    register: `${fetchBase}/api/auth/oauth2/register`,
    resource: MCP_URL,
  };
}

export function appUrl(path: string, organizationId?: string): string {
  return new URL(organizationAppPath(organizationId, path), WEB_ORIGIN).toString();
}

/** Mirrors ORGANIZATION_TOKEN in app/web/src/lib/workspace-entry.ts: an opaque id, never a slug. */
const ORGANIZATION_ID = /^[A-Za-z0-9]{16,64}$/;

/**
 * An app path scoped to a workspace: `/app/x` → `/app/o/<org>/x`. A link that
 * leaves for the browser has no idea which workspace the browser has active,
 * and an id from one workspace 404s in another; naming the workspace makes it
 * open where it belongs. Same rule as app/core/src/organization/deep-link.ts.
 * Anything else (a non-app path, no usable id) comes back unchanged.
 */
export function organizationAppPath(organizationId: string | undefined, path: string): string {
  if (!path.startsWith("/app") || path.startsWith("/app/o/")) return path;
  if (path.length > 4 && path[4] !== "/" && path[4] !== "?" && path[4] !== "#") return path;
  const id = organizationId?.trim() ?? "";
  if (!ORGANIZATION_ID.test(id)) return path;
  return `/app/o/${id}${path.slice(4)}`;
}

/** A new Twelfth chat with the composer filled in (the app does not send it). */
export function askUrl(question?: string): string {
  const q = question?.trim();
  return appUrl(q ? `/app/chat/new?q=${encodeURIComponent(q)}` : "/app/chat/new");
}

/** Where a person allows a connection more tools or ends it. */
export const CONNECTIONS_URL = appUrl("/app/settings/ai?setting=ai-mcp");
