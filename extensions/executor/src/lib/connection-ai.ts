import { connectionLabel } from "./format";
import type { ConfirmationDetails } from "./ai-tools";
import { executionOutput } from "./ai-tools";
import {
  checkConnectionHealth,
  execute,
  getIntegration,
  listConnections,
  refreshConnection,
  request,
  webUrl,
} from "./client";
import {
  connectionHandoffCode,
  directReconnectClient,
  handoffFromExecution,
  integrationDetailUrl,
  validatedIntegrationUrl,
  type IntegrationWithAuth,
  type OAuthClientSummary,
  type OAuthStartResult,
} from "./connection-actions";
import { safeBrowserUrl } from "./execution";
import type { Connection, Owner } from "./types";

export interface ConnectionTargetInput {
  /** Exact connection owner returned by list-connections. */
  owner: Owner;
  /** Exact integration slug returned by list-connections. */
  integration: string;
  /** Exact connection name returned by list-connections. */
  connection: string;
}

export interface UpdateConnectionInput extends ConnectionTargetInput {
  /** New display label. Omit to keep it unchanged; an empty string clears it. */
  label?: string;
  /** New description. Omit to keep it unchanged; an empty string clears it. */
  description?: string;
}

export interface AddConnectionInput {
  /** Exact integration slug returned by list-integrations. */
  integration: string;
  /** Connection visibility. */
  owner: Owner;
  /** Exact authentication template returned for the integration. */
  template: string;
  /** Optional account label. Never include credentials. */
  label?: string;
}

function nonEmpty(value: string, label: string): string {
  const result = value.trim();
  if (!result) throw new Error(`${label} is required.`);
  return result;
}

function owner(value: Owner): Owner {
  if (value !== "user" && value !== "org") throw new Error("Connection owner must be user or org.");
  return value;
}

export async function exactConnection(input: ConnectionTargetInput): Promise<Connection> {
  const integration = nonEmpty(input.integration, "Integration");
  const name = nonEmpty(input.connection, "Connection name");
  const connectionOwner = owner(input.owner);
  const matches = (await listConnections({ integration, owner: connectionOwner })).filter(
    (item) => item.integration === integration && item.owner === connectionOwner && item.name === name,
  );
  if (matches.length !== 1) {
    throw new Error(
      "The exact connection was not found. Refresh list-connections and use its owner, integration, and connection name.",
    );
  }
  return matches[0];
}

export async function connectionTargetInfo(connection: Connection) {
  const integration = await getIntegration(connection.integration);
  if (integration.slug !== connection.integration)
    throw new Error("Executor returned a different integration. Refresh list-integrations.");
  return [
    { name: "Integration", value: integration.name },
    { name: "Connection Scope", value: connection.owner === "org" ? "Workspace" : "Personal" },
    { name: "Connection", value: connectionLabel(connection) },
    { name: "Address", value: connection.address },
  ];
}

function metadataChanges(input: UpdateConnectionInput) {
  const changes: { identityLabel?: string | null; description?: string | null } = {};
  if (input.label !== undefined) changes.identityLabel = input.label.trim() || null;
  if (input.description !== undefined) changes.description = input.description.trim() || null;
  if (Object.keys(changes).length === 0) throw new Error("Provide a label or description to update.");
  return changes;
}

export async function updateConnectionConfirmation(input: UpdateConnectionInput): Promise<ConfirmationDetails> {
  const connection = await exactConnection(input);
  const changes = metadataChanges(input);
  return {
    message:
      "Update this exact connection's display details? Its address, credentials, and tool policies stay unchanged.",
    info: [
      ...(await connectionTargetInfo(connection)),
      ...(changes.identityLabel !== undefined
        ? [{ name: "New Label", value: changes.identityLabel ?? "(clear)" }]
        : []),
      ...(changes.description !== undefined
        ? [{ name: "New Description", value: changes.description ?? "(clear)" }]
        : []),
    ],
  };
}

export async function updateExecutorConnection(input: UpdateConnectionInput) {
  const connection = await exactConnection(input);
  const updated = await request<Connection>(
    `/api/connections/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.integration)}/${encodeURIComponent(connection.name)}`,
    { method: "PATCH", body: JSON.stringify(metadataChanges(input)) },
  );
  return { connection: updated };
}

export async function connectionActionConfirmation(
  input: ConnectionTargetInput,
  action: "health" | "resync" | "reconnect",
): Promise<ConfirmationDetails> {
  const connection = await exactConnection(input);
  const messages = {
    health: "Run and persist a fresh health check for this exact connection?",
    resync: "Resync the tools exposed by this exact connection?",
    reconnect: "Start reconnection for this exact connection? Authorization may continue in a secure browser page.",
  };
  return { message: messages[action], info: await connectionTargetInfo(connection) };
}

export async function checkExecutorConnection(input: ConnectionTargetInput) {
  const connection = await exactConnection(input);
  return { connection: connection.address, health: await checkConnectionHealth(connection) };
}

export async function resyncExecutorConnection(input: ConnectionTargetInput) {
  const connection = await exactConnection(input);
  const tools = await refreshConnection(connection);
  const previewLimit = 20;
  return {
    connection: connection.address,
    resynced: true,
    toolCount: tools.length,
    toolPreview: tools.slice(0, previewLimit),
    truncated: tools.length > previewLimit,
    nextStep:
      tools.length > previewLimit
        ? "Use discover-tools with this integration to browse the remaining tools."
        : undefined,
  };
}

async function validatedAddInput(input: AddConnectionInput) {
  const integrationSlug = nonEmpty(input.integration, "Integration");
  const template = nonEmpty(input.template, "Authentication template");
  const integration = (await getIntegration(integrationSlug)) as IntegrationWithAuth;
  if (integration.slug !== integrationSlug)
    throw new Error("Executor returned a different integration. Refresh list-integrations.");
  const method = integration.authMethods.find((candidate) => candidate.template === template);
  if (!method) throw new Error("This authentication template is not available. Refresh list-integrations.");
  return { integration, method, owner: owner(input.owner), label: input.label?.trim() || undefined };
}

export async function addConnectionConfirmation(input: AddConnectionInput): Promise<ConfirmationDetails> {
  const target = await validatedAddInput(input);
  return {
    message:
      "Open native connection setup for this workspace? The user enters credentials privately in Raycast or authorizes in a browser. Opening setup does not create a connection.",
    info: [
      { name: "Integration", value: target.integration.name },
      { name: "Connection Scope", value: target.owner === "org" ? "Workspace" : "Personal" },
      { name: "Authentication", value: target.method.label },
      ...(target.label ? [{ name: "Label", value: target.label }] : []),
    ],
  };
}

async function browserHandoff(input: AddConnectionInput) {
  const target = await validatedAddInput(input);
  const result = await execute(
    connectionHandoffCode({
      integration: target.integration.slug,
      owner: target.owner,
      template: target.method.template,
      ...(target.label ? { label: target.label } : {}),
    }),
  );
  if (result.status === "paused") return executionOutput(result);
  const handoff = handoffFromExecution(result);
  const url = handoff && validatedIntegrationUrl(handoff.url, webUrl(), target.integration.slug);
  if (!url) throw new Error("Executor did not return a valid setup URL for this server.");
  return {
    status: "browser_action_required",
    pending: true,
    url,
    instructions: "Complete setup in Executor, then call list-connections to verify that the new connection exists.",
  };
}

export function startExecutorConnection(input: AddConnectionInput) {
  return browserHandoff(input);
}

export async function reconnectExecutorConnection(input: ConnectionTargetInput) {
  const connection = await exactConnection(input);
  const integration = (await getIntegration(connection.integration)) as IntegrationWithAuth;
  const clients = await request<OAuthClientSummary[]>("/api/oauth/clients");
  const client = directReconnectClient(clients, connection, integration);

  if (!client) {
    const result = await execute(
      connectionHandoffCode({
        integration: connection.integration,
        owner: connection.owner,
        template: connection.template,
        label: connection.name,
      }),
    );
    if (result.status === "paused") return executionOutput(result);
    const handoff = handoffFromExecution(result);
    const safeUrl = handoff && validatedIntegrationUrl(handoff.url, webUrl(), connection.integration);
    if (!safeUrl) throw new Error("Executor did not return a valid integration URL for this server.");
    return {
      status: "browser_action_required",
      pending: true,
      url: integrationDetailUrl(safeUrl),
      instructions: "Reconnect in Executor, then call check-connection-health to verify the result.",
    };
  }

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
    }),
  });
  if (started.status === "redirect") {
    const url = started.authorizationUrl && safeBrowserUrl(started.authorizationUrl);
    if (!url) throw new Error("Executor returned an unsafe OAuth authorization URL.");
    return {
      status: "browser_action_required",
      pending: true,
      url,
      instructions: "Finish authorization, then call check-connection-health to verify the result.",
    };
  }
  if (started.status !== "connected") throw new Error("Executor returned an unknown reconnect status.");
  return {
    status: "connected",
    pending: false,
    connection: connection.address,
    instructions: "Executor completed the reconnect. Call check-connection-health for a fresh health result.",
  };
}
