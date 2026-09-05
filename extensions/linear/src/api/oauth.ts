import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

type AuthBackend = "manual" | "utils";
// Flip to "utils" once the raycast/utils PR adding providerId/extraParameters ships (design D8).
export const AUTH_BACKEND: AuthBackend = "manual";

// Copied from @raycast/utils' built-in Linear provider (delete when AUTH_BACKEND becomes "utils"):
export const LINEAR_PROXY = "https://linear.oauth.raycast.com";
export const LINEAR_PROXY_CLIENT_ID = "c8ff37b9225c3c9aefd7d66ea0e5b6f1";

// The existing login. Slot 0: providerId "linear", exactly today's service.
export const linear = OAuthService.linear({ scope: "read write" });

export function workspaceProviderId(orgId: string, userId: string): string {
  return `linear-ws-${orgId}-${userId}`;
}

export function makeLinearOAuthService(providerId: string, description: string, providerName = "Linear"): OAuthService {
  if (AUTH_BACKEND === "utils") {
    // Requires the raycast/utils PR (Plan 2): providerId + extraParameters options.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return OAuthService.linear({ scope: "read write", providerId, extraParameters: { prompt: "consent" } } as any);
  }
  return new OAuthService({
    client: new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.Web,
      providerName,
      providerIcon: "linear-app-icon.png",
      providerId,
      description,
    }),
    clientId: LINEAR_PROXY_CLIENT_ID,
    scope: "read write",
    authorizeUrl: `${LINEAR_PROXY}/authorize`,
    tokenUrl: `${LINEAR_PROXY}/token`,
    refreshTokenUrl: `${LINEAR_PROXY}/refresh-token`,
    // prompt=consent is MANDATORY: without it an already-granted app silently skips
    // Linear's consent screen, so a second-workspace grant is unreachable (spike S3).
    extraParameters: { actor: "user", prompt: "consent" },
  });
}

export const stagingService = makeLinearOAuthService("linear-staging", "Connect a Linear workspace");

const servicesByProviderId = new Map<string, OAuthService>();

export function getServiceForProviderId(providerId: string, description?: string, providerName?: string): OAuthService {
  // D11: once slot 0's identity is known, entry-addressed callers pass a providerName
  // and get a LABELED client (same providerId "linear" → same stored token, spike S1/S2).
  // Label-less callers (pre-identity paths: migration's token read, fresh-install login)
  // keep the stock handle.
  if (providerId === "linear" && !providerName) return linear;
  if (providerId === "linear-staging") return stagingService;
  let service = servicesByProviderId.get(providerId);
  if (!service) {
    service = makeLinearOAuthService(providerId, description ?? "Connect your Linear account", providerName);
    servicesByProviderId.set(providerId, service);
  }
  return service;
}

// Background-safe refresh (spike S6). Never deletes tokens: 400, 5xx, and network
// errors all leave the stored token set untouched, unlike utils' refreshTokens().
export async function refreshNonDestructive(
  service: OAuthService,
): Promise<{ status: "ok"; accessToken: string } | { status: "failed" }> {
  const tokens = await service.client.getTokens();
  if (!tokens?.refreshToken) return { status: "failed" };
  try {
    const response = await fetch(`${LINEAR_PROXY}/refresh-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: LINEAR_PROXY_CLIENT_ID,
        refresh_token: tokens.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) return { status: "failed" };
    const next = (await response.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
    await service.client.setTokens({ ...next, refresh_token: next.refresh_token ?? tokens.refreshToken });
    return { status: "ok", accessToken: next.access_token };
  } catch {
    return { status: "failed" };
  }
}

// Matches Raycast's own background-auth error so existing boundaries
// (BackgroundAuthBoundary in unread-notifications.tsx) keep working.
export const BACKGROUND_AUTH_ERROR = "OAuth request creation is not available when command is launched in background";

export async function ensureToken(service: OAuthService, options: { interactive: boolean }): Promise<string> {
  if (options.interactive) {
    return service.authorize();
  }
  const tokens = await service.client.getTokens();
  if (tokens?.accessToken && !tokens.isExpired()) return tokens.accessToken;
  const refreshed = await refreshNonDestructive(service);
  if (refreshed.status === "ok") return refreshed.accessToken;
  throw new Error(BACKGROUND_AUTH_ERROR);
}

export type ViewerIdentity = { userId: string; userEmail: string; orgId: string; orgName: string; urlKey: string };

export async function fetchViewerIdentity(accessToken: string): Promise<ViewerIdentity> {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ query: "query { viewer { id email organization { id name urlKey } } }" }),
  });
  if (!response.ok) throw new Error(`Linear identity query failed: HTTP ${response.status}`);
  const json = (await response.json()) as {
    data?: { viewer?: { id: string; email: string; organization: { id: string; name: string; urlKey: string } } };
  };
  const viewer = json.data?.viewer;
  if (!viewer) throw new Error("Linear identity query returned no viewer");
  return {
    userId: viewer.id,
    userEmail: viewer.email,
    orgId: viewer.organization.id,
    orgName: viewer.organization.name,
    urlKey: viewer.organization.urlKey,
  };
}
