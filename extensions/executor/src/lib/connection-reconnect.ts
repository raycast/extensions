import { getIntegration, request, webUrl } from "./client";
import {
  directReconnectClient,
  matchingOAuthClient,
  type IntegrationWithAuth,
  type OAuthClientSummary,
  type OAuthStartResult,
} from "./connection-actions";
import { safeBrowserUrl } from "./execution";
import type { Connection } from "./types";

interface OAuthProbe {
  issuer?: string | null;
  authorizationUrl: string;
  tokenUrl: string;
  resource?: string | null;
  scopesSupported?: string[] | null;
  registrationEndpoint?: string | null;
  tokenEndpointAuthMethodsSupported?: string[] | null;
  clientIdMetadataDocumentSupported?: boolean | null;
}

function requireActive(isActive: () => boolean) {
  if (!isActive()) throw new Error("Reconnection was cancelled because the view closed.");
}

function requireUrl(value: string): string {
  const url = safeBrowserUrl(value);
  if (!url) throw new Error("Executor returned an unsafe OAuth endpoint.");
  return url;
}

async function registerReconnectClient(
  connection: Connection,
  stored: OAuthClientSummary,
  method: IntegrationWithAuth["authMethods"][number],
  isActive: () => boolean,
): Promise<{ slug: string; owner: Connection["owner"] } | undefined> {
  const discoveryUrl = method.oauth?.discoveryUrl ?? method.oauth?.tokenUrl;
  if (!discoveryUrl) return undefined;
  const probe = await request<OAuthProbe>("/api/oauth/probe", {
    method: "POST",
    body: JSON.stringify({ url: requireUrl(discoveryUrl) }),
  });
  requireActive(isActive);
  // CIMD setup needs deployment-specific client metadata. Keep that flow in Executor.
  if (probe.clientIdMetadataDocumentSupported || !probe.registrationEndpoint) return undefined;
  const registrationEndpoint = requireUrl(probe.registrationEndpoint);
  const host = new URL(probe.issuer ? requireUrl(probe.issuer) : registrationEndpoint).hostname;
  const slug = `dcr-${
    host
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "authorization-server"
  }`;
  const registered = await request<{ client: string }>("/api/oauth/clients/register-dynamic", {
    method: "POST",
    body: JSON.stringify({
      owner: stored.owner,
      slug,
      issuer: probe.issuer ?? null,
      registrationEndpoint,
      authorizationUrl: requireUrl(probe.authorizationUrl),
      tokenUrl: requireUrl(probe.tokenUrl),
      // Executor preserves an explicitly absent resource, but follows a migrated resource.
      resource: stored.resource == null ? null : (probe.resource ?? stored.resource),
      scopes: method.oauth?.scopes?.length ? method.oauth.scopes : (probe.scopesSupported ?? []),
      tokenEndpointAuthMethodsSupported: probe.tokenEndpointAuthMethodsSupported ?? undefined,
      clientName: "Executor",
      redirectUri: webUrl("/api/oauth/callback"),
      originIntegration: connection.integration,
    }),
  });
  requireActive(isActive);
  if (typeof registered.client !== "string" || !registered.client.trim()) {
    throw new Error("Executor did not return the registered OAuth app.");
  }
  return { slug: registered.client, owner: stored.owner };
}

/** Start the same saved connection; undefined means supported browser setup is required. */
export async function startOAuthReconnect(
  connection: Connection,
  isActive: () => boolean = () => true,
): Promise<OAuthStartResult | undefined> {
  requireActive(isActive);
  if (!connection.oauthClient) return undefined;
  const [integration, clients] = await Promise.all([
    getIntegration(connection.integration) as Promise<IntegrationWithAuth>,
    request<OAuthClientSummary[]>("/api/oauth/clients"),
  ]);
  requireActive(isActive);
  const method = integration.authMethods.find((item) => item.kind === "oauth" && item.template === connection.template);
  if (!method || method.oauth?.enterpriseIdentityProvider) return undefined;
  let client: { slug: string; owner: Connection["owner"] } | undefined = directReconnectClient(
    clients,
    connection,
    integration,
  );
  if (!client) {
    const stored = matchingOAuthClient(clients, connection);
    if (stored?.origin?.kind !== "dynamic_client_registration" || stored.grant !== "authorization_code")
      return undefined;
    client = await registerReconnectClient(connection, stored, method, isActive);
    if (!client) return undefined;
  }
  requireActive(isActive);
  const started = await request<OAuthStartResult>("/api/oauth/start", {
    method: "POST",
    body: JSON.stringify({
      client: client.slug,
      clientOwner: client.owner,
      owner: connection.owner,
      name: connection.name,
      integration: connection.integration,
      template: connection.template,
      identityLabel: connection.identityLabel ?? null,
      redirectUri: webUrl("/api/oauth/callback"),
    }),
  });
  requireActive(isActive);
  if (started.status === "redirect") requireUrl(started.authorizationUrl ?? "");
  else if (started.status !== "connected") throw new Error("Executor returned an unknown reconnect status.");
  return started;
}
