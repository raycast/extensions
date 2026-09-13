/**
 * Raycast-specific Hub Protocol client.
 *
 * Wraps HubRestClient from @synap/hub-rest-client, reading credentials from
 * Raycast's LocalStorage (Cloud OAuth flow) or Preferences (manual setup).
 *
 * All core types and HTTP logic live in the shared package.
 * This file only adds Raycast credential resolution.
 */

import { HubRestClient, HubApiError, checkPodHealth, setupAgent } from "@synap/hub-rest-client";
import type { HubDiagnoseInput } from "@synap/hub-rest-client";
import { getConnection, type SynapConnection } from "../utils/preferences";

// Re-export so callers can use these directly without knowing the package
export { HubApiError, checkPodHealth, setupAgent };
export type { CaptureProposal, CaptureRelation, HubGovernanceResult } from "@synap/hub-rest-client";

export type ConnectionProblemKind = "not-configured" | "unauthorized";

/** Raised only by AI tool entry points when a connection is not an agent key. */
export class AgentConnectionRequiredError extends Error {
  constructor(connection: SynapConnection | null) {
    const posture = !connection
      ? "No Synap connection is configured."
      : connection.keySource === "agent"
        ? "A Raycast agent key is stored, but the pod did not treat it as an agent (reconnect)."
        : connection.source === "cli"
          ? "Raycast is using a CLI pod/human key, not the dedicated agent key."
          : "Raycast is using a human Hub key from Connect, not the dedicated agent key.";
    const remedy =
      connection?.source === "cli"
        ? "Run `synap connect --target=raycast` to provision Raycast's dedicated agent key."
        : "Reconnect through Connect to Synap Pod to provision Raycast's dedicated agent key.";
    super(`${posture} AI writes require a dedicated Raycast agent key. ${remedy}`);
    this.name = "AgentConnectionRequiredError";
  }
}

/**
 * Raycast UI commands are explicit human actions and may use a human key. AI
 * tools must use a dedicated agent key so the pod proposal gate can attribute
 * and govern their mutations instead of treating them as direct human writes.
 */
export async function requireAgentConnection(): Promise<void> {
  const connection = await getConnection();
  if (!connection) throw new AgentConnectionRequiredError(null);
  const identity = await getMe();
  if (!identity.isAgent) throw new AgentConnectionRequiredError(connection);
}

/**
 * The ONE terminal command that fixes a CLI-sourced credential problem,
 * or null when the connection isn't CLI-managed. Every remedy string and
 * copy-to-clipboard action must come from here — no duplicated command text.
 */
export function connectionFixCommand(conn: SynapConnection | null): string | null {
  if (conn?.source !== "cli") return null;
  return conn.keySource === "agent" ? "synap connect --target=raycast" : "synap pods add";
}

function headlineFor(kind: ConnectionProblemKind, conn: SynapConnection | null): string {
  if (kind === "not-configured") return "Synap is not connected.";
  const where = conn?.podName ? `pod '${conn.podName}'` : (conn?.podUrl ?? "your pod");
  return `Synap rejected the credentials for ${where} (401).`;
}

function remedyFor(kind: ConnectionProblemKind, conn: SynapConnection | null): string {
  if (kind === "not-configured") {
    return "Run 'Connect to Synap Pod' to set up, or `synap pods add` in your terminal.";
  }
  const fix = connectionFixCommand(conn);
  if (fix) {
    return conn?.keySource === "agent"
      ? `Run \`${fix}\` in your terminal to re-provision the Raycast key for this pod, or switch to another pod.`
      : `Run \`${fix}\` in your terminal to refresh this pod's key, or switch to another pod.`;
  }
  return "Open 'Connect to Synap Pod' and reconnect to issue a fresh key.";
}

/**
 * A connection-level failure with enough context for the UI to show the ONE fix
 * that actually helps. Never destroys stored credentials — surfacing the problem
 * and the remedy is the views' job, acting on it is the user's.
 *
 * Extends HubApiError (statusCode 401) so pre-existing `instanceof HubApiError`
 * catch blocks in mutation flows keep showing the actionable message instead of
 * falling through to "Unknown error".
 */
export class ConnectionProblem extends HubApiError {
  readonly kind: ConnectionProblemKind;
  readonly connection: SynapConnection | null;

  constructor(kind: ConnectionProblemKind, connection: SynapConnection | null, body?: unknown) {
    super(`${headlineFor(kind, connection)} ${remedyFor(kind, connection)}`, 401, body);
    this.name = "ConnectionProblem";
    this.kind = kind;
    this.connection = connection;
  }

  /** Short statement of what went wrong. */
  get headline(): string {
    return headlineFor(this.kind, this.connection);
  }

  /** The action that fixes this problem, phrased for the user. */
  get remedy(): string {
    return remedyFor(this.kind, this.connection);
  }
}

async function buildClient(): Promise<{ client: HubRestClient; conn: SynapConnection }> {
  const conn = await getConnection();
  if (!conn) {
    throw new ConnectionProblem("not-configured", null);
  }
  return {
    // A configured workspace is a local navigation preference, not an
    // authoritative data lens. Passing it here would silently scope every
    // request, including pod-wide reads and writes. Callers send workspaceId
    // only after the user or Synap's routing result has selected one.
    client: new HubRestClient({ podUrl: conn.podUrl, apiKey: conn.apiKey }),
    conn,
  };
}

async function withClient<T>(operation: (client: HubRestClient) => Promise<T>): Promise<T> {
  const { client, conn } = await buildClient();
  try {
    return await operation(client);
  } catch (error) {
    // A 401 means THESE credentials are wrong for THIS pod. Never wipe stored
    // credentials here: for CLI-sourced config the store is ~/.synap/config.json
    // (which Raycast must not destroy), and for OAuth/prefs an automatic wipe
    // just strands the user. Report precisely; let the user act.
    if (error instanceof HubApiError && error.isUnauthorized && !(error instanceof ConnectionProblem)) {
      throw new ConnectionProblem("unauthorized", conn, error.body);
    }
    throw error;
  }
}

// ─── Typed wrappers ───────────────────────────────────────────────────────────
// Each builds a fresh client from current credentials and delegates.

export async function getMe() {
  return withClient((client) => client.getMe());
}

export async function getWorkspaces() {
  return withClient((client) => client.getWorkspaces());
}

export async function searchEntities(
  query: string,
  options?: Parameters<HubRestClient["searchEntities"]>[1],
  signal?: AbortSignal
) {
  return withClient((client) => client.searchEntities(query, options, signal));
}

export async function getEntity(id: string) {
  return withClient((client) => client.getEntity(id));
}

/**
 * Return the complete local neighbourhood for an entity: explicit graph links,
 * structural property links, and related threads/focus sessions. The backend
 * already shapes these into one access-controlled response.
 */
export async function getConnections(entityId: string, options?: Parameters<HubRestClient["getConnections"]>[1]) {
  return withClient((client) => client.getConnections(entityId, options));
}

export async function getRecentEntities(options?: Parameters<HubRestClient["getRecentEntities"]>[0]) {
  return withClient((client) => client.getRecentEntities(options));
}

export async function createEntity(input: Parameters<HubRestClient["createEntity"]>[0]) {
  return withClient((client) => client.createEntity(input));
}

export async function updateEntity(id: string, input: Parameters<HubRestClient["updateEntity"]>[1]) {
  return withClient((client) => client.updateEntity(id, input));
}

export async function storeMemory(input: Parameters<HubRestClient["storeMemory"]>[0]) {
  return withClient((client) => client.storeMemory(input));
}

export async function recallMemory(query: string, options?: Parameters<HubRestClient["recallMemory"]>[1]) {
  return withClient((client) => client.recallMemory(query, options));
}

// The one recall door — routes across entities / runbooks / facts server-side.
export async function ask(input: Parameters<HubRestClient["ask"]>[0]) {
  return withClient((client) => client.ask(input));
}

export async function getChannels(options?: Parameters<HubRestClient["getChannels"]>[0]) {
  return withClient((client) => client.getChannels(options));
}

export async function sendToChannel(input: Parameters<HubRestClient["sendToChannel"]>[0]) {
  return withClient((client) => client.sendToChannel(input));
}

export async function captureStructure(
  input: Parameters<HubRestClient["captureStructure"]>[0]
): Promise<Awaited<ReturnType<HubRestClient["captureStructure"]>>> {
  return withClient((client) => client.captureStructure(input));
}

/**
 * Submit an already reviewed capture plan as one governed composite proposal.
 * The plan remains inspectable and reversible in the same proposal flow as
 * every other external agent write; this adapter owns no HTTP or policy logic.
 */
export async function submitCaptureGraph(input: Parameters<HubRestClient["submitCaptureGraph"]>[0]) {
  return withClient((client) => client.submitCaptureGraph(input));
}

export async function createRelation(input: Parameters<HubRestClient["createRelation"]>[0]) {
  return withClient((client) => client.createRelation(input));
}

export async function attachFacet(input: Parameters<HubRestClient["attachFacet"]>[0]) {
  return withClient((client) => client.attachFacet(input));
}

/**
 * Load only the profile schemas needed for the next action. A workspace lens
 * is sent only when the caller explicitly provides one.
 */
export async function discover(options?: Parameters<HubRestClient["discover"]>[0]) {
  return withClient((client) => client.discover(options));
}

/** Canonical live session lens for every external AI surface. */
export async function orient(options?: Parameters<HubRestClient["orient"]>[0]) {
  return withClient((client) => client.orient(options));
}

/**
 * Return the caller-visible skill index. The Hub route owns the pod, owner,
 * workspace-membership, instruction, active, and approval gates; Raycast
 * deliberately receives bodies only through the explicit load door below.
 */
export async function listAvailableSkills(options?: Parameters<HubRestClient["listAgentSkills"]>[0]) {
  return withClient((client) => client.listAgentSkills(options));
}

/** Load one caller-visible skill body after the agent selects it from the index. */
export async function loadAvailableSkill(slug: string) {
  return withClient((client) => client.getAgentSkillBySlug(slug));
}

/**
 * Execution-safe action projection shared with MCP: every row is approved,
 * connected when applicable, and carries the real parameter schema.
 */
export async function getActionCatalog(options?: Parameters<HubRestClient["listRunnableCapabilityActions"]>[0]) {
  return withClient((client) => client.listRunnableCapabilityActions(options));
}

/** Just-in-time action guidance for one selected runnable action. */
export async function getActionBrief(input: Parameters<HubRestClient["getCapabilityBriefs"]>[0]) {
  return withClient((client) => client.getCapabilityBriefs(input));
}

/** Execute exactly one catalog verb through the shared capability governance gate. */
export async function runAction(input: Parameters<HubRestClient["executeCapability"]>[0]) {
  return withClient((client) => client.executeCapability(input));
}

export async function listProposals(options?: Parameters<HubRestClient["listProposals"]>[0]) {
  return withClient((client) => client.listProposals(options));
}

export async function listProfiles(workspaceId: string, options?: Parameters<HubRestClient["listProfiles"]>[1]) {
  return withClient((client) => client.listProfiles(workspaceId, options));
}

const PROFILE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Hub view routes take a profile UUID (`profileId`). Raycast callers often
 * have a slug from list-profiles — resolve it here so we never send "task"
 * as a UUID.
 */
export async function resolveProfileId(
  workspaceId: string,
  slugOrId: string
): Promise<{ id: string } | { error: string }> {
  const value = slugOrId.trim();
  if (!value) return { error: "profileSlug is empty." };
  if (PROFILE_UUID.test(value)) return { id: value };
  const profiles = await listProfiles(workspaceId);
  const match = profiles.find((profile) => profile.slug.toLowerCase() === value.toLowerCase());
  if (!match) {
    return {
      error: `No profile "${value}" in this workspace. Use a slug from list-profiles, or omit profileSlug to leave the view unscoped.`,
    };
  }
  return { id: match.id };
}

/** Approve or reject a proposal through the pod's governance gate. */
export async function reviewProposal(proposalId: string, decision: "approved" | "rejected", reason?: string) {
  return withClient((client) => client.reviewProposal(proposalId, decision, reason));
}

export type { HubDiagnoseInput as DiagnoseParams, HubDiagnoseResult } from "@synap/hub-rest-client";

/**
 * THE diagnose door. Same `POST /api/hub/diagnose` the MCP surface uses,
 * through HubRestClient (no parallel fetch).
 */
export async function diagnose(params: HubDiagnoseInput = {}) {
  return withClient((client) => client.diagnose(params));
}

/** Declare a focus session (not the runtime). POST /api/hub/focus-sessions. */
export async function createFocusSession(input: Parameters<HubRestClient["createFocusSession"]>[0]) {
  return withClient((client) => client.createFocusSession(input));
}

/** Pack-grouped capability catalog (status + nextAction). Not the runnable-now projection. */
export async function getCapabilityCatalog(options: Parameters<HubRestClient["getCapabilityCatalog"]>[0]) {
  return withClient((client) => client.getCapabilityCatalog(options));
}

/** List saved views in one workspace. Owner floor lives on the Hub route. */
export async function listViews(workspaceId: string, options?: Parameters<HubRestClient["listViews"]>[1]) {
  return withClient((client) => client.listViews(workspaceId, options));
}

/** Create a view through Hub governance. proposed is success. */
export async function createView(input: Parameters<HubRestClient["createView"]>[0]) {
  return withClient((client) => client.createView(input));
}

/**
 * Compose widget catalog merge (builtins + generated DB rows).
 * Wraps GET /api/hub/widget-definitions — do not copy COMPOSE_WIDGET_CATALOG here.
 */
export async function listWidgetDefinitions(options?: Parameters<HubRestClient["listWidgetDefinitions"]>[0]) {
  return withClient((client) => client.listWidgetDefinitions(options));
}
