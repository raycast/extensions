import { ExecutorError, getIntegration, listConnections, request } from "./client";
import type { IntegrationWithAuth, OAuthClientSummary } from "./connection-actions";
import { safeBrowserUrl } from "./execution";
import type { Connection, Owner } from "./types";

export type AuthMethod = IntegrationWithAuth["authMethods"][number];
export interface SetupTarget {
  integration: string;
  owner: Owner;
  template: string;
  label?: string;
}

export function credentialFields(method: AuthMethod): string[] | undefined {
  if (method.kind === "none") return [];
  if (!["apikey", "header"].includes(method.kind) || !method.placements?.length) return undefined;
  const fields = [
    ...new Set(method.placements.filter((p) => p.literal === undefined).map((p) => p.variable ?? "token")),
  ];
  return fields.length ? fields : undefined;
}

function host(url?: string): string | undefined {
  try {
    return url ? new URL(url).host : undefined;
  } catch {
    return undefined;
  }
}

/** Match declared integration intent or exact OAuth endpoint host, never a loose domain guess. */
export function setupOAuthClients(
  clients: OAuthClientSummary[],
  integration: string,
  method: AuthMethod,
  owner: Owner,
) {
  if (method.kind !== "oauth" || method.oauth?.enterpriseIdentityProvider) return [];
  return clients.filter((client) => {
    if (client.grant === "id_jag" || client.origin.kind === "dynamic_client_registration") return false;
    if (client.origin.kind === "first_party") {
      if (!client.origin.integrations?.includes(integration)) return false;
      const allowed = client.origin.allowedScopes;
      return (
        !allowed ||
        (method.oauth?.scopes
          ? method.oauth.scopes.every((scope) => allowed.includes(scope))
          : Boolean(method.oauth?.discoveryUrl))
      );
    }
    if (owner === "org" && client.owner === "user") return false;
    if (client.origin.kind === "manual" && client.origin.integration === integration) return true;
    const endpoints = [host(method.oauth?.authorizationUrl), host(method.oauth?.tokenUrl)].filter(Boolean);
    return (
      endpoints.length > 0 &&
      [host(client.authorizationUrl), host(client.tokenUrl)].some((h) => h && endpoints.includes(h))
    );
  });
}

export async function setupMethod(target: SetupTarget): Promise<AuthMethod> {
  if (!["user", "org"].includes(target.owner)) throw new Error("Choose Personal or Workspace.");
  const integration = (await getIntegration(target.integration)) as IntegrationWithAuth;
  const method = integration.authMethods.find((m) => m.template === target.template);
  if (integration.slug !== target.integration || !method)
    throw new Error("Authentication changed. Reload the integration.");
  return method;
}

async function newName(target: SetupTarget) {
  const rows = await listConnections({ integration: target.integration, owner: target.owner });
  const base =
    (target.label?.trim() || (target.owner === "org" ? "workspace" : "personal"))
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "connection";
  let name = base;
  for (let i = 2; rows.some((c) => c.name === name); i++) name = `${base}_${i}`;
  return { name, baseline: new Set(rows.map((c) => c.address)) };
}

/** Never surface a credential-bearing request or provider error in a toast or log. */
function safeSetupError(error: unknown): Error {
  if (error instanceof ExecutorError && [401, 403, 409].includes(error.status)) {
    return new Error(
      error.status === 409
        ? "That connection name is now taken. Refresh connections before trying again."
        : error.status === 403
          ? "Executor does not permit this operation for your account."
          : "Executor rejected this workspace's API key.",
    );
  }
  return new Error("Executor did not confirm the connection. Check Manage Connections before trying again.");
}

export async function createNativeConnection(target: SetupTarget, values: Record<string, string>) {
  const method = await setupMethod(target);
  const fields = credentialFields(method);
  if (!fields) throw new Error("This authentication method needs setup in Executor.");
  if (Object.keys(values).some((key) => !fields.includes(key)) || fields.some((key) => !values[key]?.trim()))
    throw new Error("Complete the required credential fields.");
  const { name } = await newName(target);
  try {
    const connection = await request<Connection>("/api/connections", {
      method: "POST",
      body: JSON.stringify({
        owner: target.owner,
        integration: target.integration,
        template: target.template,
        name,
        identityLabel: target.label?.trim() || name,
        values,
      }),
    });
    if (
      connection.integration !== target.integration ||
      connection.owner !== target.owner ||
      connection.name !== name ||
      connection.template !== target.template
    )
      throw new Error("Unexpected connection response");
    return connection;
  } catch (error) {
    throw safeSetupError(error);
  }
}

export async function startNativeOAuth(target: SetupTarget, clientKey: string) {
  const method = await setupMethod(target);
  const clients = setupOAuthClients(
    await request<OAuthClientSummary[]>("/api/oauth/clients"),
    target.integration,
    method,
    target.owner,
  );
  const client = clients.find((c) => `${c.owner}/${c.slug}` === clientKey);
  if (!client) throw new Error("The OAuth app is no longer available. Reload the integration.");
  const { name, baseline } = await newName(target);
  const result = await request<{ status: string; connection?: Connection; authorizationUrl?: string }>(
    "/api/oauth/start",
    {
      method: "POST",
      body: JSON.stringify({
        owner: target.owner,
        integration: target.integration,
        template: target.template,
        name,
        identityLabel: target.label?.trim() || name,
        client: client.slug,
        clientOwner: client.owner,
        newConnection: true,
      }),
    },
  );
  if (result.status === "connected") {
    const c = result.connection;
    if (
      !c ||
      c.integration !== target.integration ||
      c.owner !== target.owner ||
      c.template !== target.template ||
      baseline.has(c.address)
    )
      throw new Error("Executor did not confirm a new connection. Check Manage Connections.");
    return { connection: c, baseline };
  }
  const url = result.authorizationUrl && safeBrowserUrl(result.authorizationUrl);
  if (result.status !== "redirect" || !url)
    throw new Error("Executor did not return a valid authorization link. Check Manage Connections.");
  return { url, baseline };
}
