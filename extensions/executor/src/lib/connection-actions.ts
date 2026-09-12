import type { Connection, ExecutionResult, Integration, Owner } from "./types";

export interface OAuthClientSummary {
  owner: Owner;
  slug: string;
  grant: "authorization_code" | "client_credentials" | "id_jag";
  authorizationUrl?: string;
  tokenUrl?: string;
  resource?: string | null;
  origin:
    | { kind: "manual"; integration?: string | null }
    | { kind: "dynamic_client_registration"; integration?: string | null }
    | { kind: "first_party"; integrations?: string[] | null; allowedScopes?: string[] };
}

export interface OAuthStartResult {
  status: "connected" | "redirect";
  authorizationUrl?: string;
}

export interface ConnectionHandoff {
  url: string;
  instructions: string;
}

export interface ConnectionCheckTarget {
  integration: string;
  owner: Owner;
  template: string;
  baseline: ReadonlySet<string>;
}

export type IntegrationWithAuth = Omit<Integration, "authMethods"> & {
  authMethods: Array<{
    id: string;
    label: string;
    kind: string;
    template: string;
    placements?: { variable?: string; literal?: string; name: string }[];
    oauth?: {
      authorizationUrl?: string;
      tokenUrl?: string;
      scopes?: string[];
      discoveryUrl?: string;
      enterpriseIdentityProvider?: { client: string; clientOwner: Owner } | null;
    } | null;
  }>;
};

export function needsReconnect(connection: Connection): boolean {
  return connection.lastHealth?.status === "expired" || connection.missingOAuthScopes.length > 0;
}

export function matchingOAuthClient(
  clients: readonly OAuthClientSummary[],
  connection: Connection,
): OAuthClientSummary | undefined {
  if (!connection.oauthClient) return undefined;
  const owner = connection.oauthClientOwner ?? connection.owner;
  return clients.find((client) => client.owner === owner && client.slug === connection.oauthClient);
}

export function directReconnectClient(
  clients: readonly OAuthClientSummary[],
  connection: Connection,
  integration: IntegrationWithAuth | undefined,
): OAuthClientSummary | undefined {
  const method = integration?.authMethods.find(
    (candidate) => candidate.kind === "oauth" && candidate.template === connection.template,
  );
  if (!method || method.oauth?.enterpriseIdentityProvider) return undefined;
  const client = matchingOAuthClient(clients, connection);
  if (!client || !client.origin || client.grant === "id_jag" || client.origin.kind === "dynamic_client_registration")
    return undefined;
  if (
    client.origin.kind === "first_party" &&
    client.origin.integrations &&
    !client.origin.integrations.includes(connection.integration)
  ) {
    return undefined;
  }
  return client;
}

function executionData(result: ExecutionResult): unknown {
  if (result.status !== "completed" || result.isError) return undefined;
  const structured = asRecord(result.structured);
  const toolResult = asRecord(structured?.result);
  return toolResult?.ok === true ? toolResult.data : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function handoffFromExecution(result: ExecutionResult): ConnectionHandoff | undefined {
  const value = asRecord(executionData(result));
  return typeof value?.url === "string" && typeof value.instructions === "string"
    ? { url: value.url, instructions: value.instructions }
    : undefined;
}

export function connectionHandoffCode(input: {
  integration: string;
  owner?: Owner;
  template?: string;
  label?: string;
}): string {
  const args = JSON.stringify(input);
  return `return await tools['executor.coreTools.connections.createHandoff'](JSON.parse(${JSON.stringify(args)}));`;
}

export function validatedIntegrationUrl(
  value: string,
  configuredServerUrl: string,
  integration: string,
): string | undefined {
  try {
    const url = new URL(value);
    const server = new URL(configuredServerUrl);
    if (url.origin !== server.origin || url.username || url.password) return undefined;
    const segments = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const integrationIndex = segments.lastIndexOf("integrations");
    if (integrationIndex < 0 || segments[integrationIndex + 1] !== integration) return undefined;
    if (integrationIndex + 2 !== segments.length) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function integrationDetailUrl(handoffUrl: string): string {
  const url = new URL(handoffUrl);
  url.search = "";
  url.hash = "";
  return url.href;
}

export function newlyCreatedConnection(target: ConnectionCheckTarget, connections: readonly Connection[]) {
  return connections.find(
    (connection) =>
      connection.integration === target.integration &&
      connection.owner === target.owner &&
      connection.template === target.template &&
      !target.baseline.has(connection.address),
  );
}
