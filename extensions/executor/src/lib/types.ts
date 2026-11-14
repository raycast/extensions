/**
 * Types transcribed from the Executor OpenAPI 3.1 document
 * (https://executor.sh/api/openapi.json, info.version 0.0.1).
 *
 * Numeric fields are declared in the spec as a union of number and the string
 * literals "NaN", "Infinity" and "-Infinity", because the server serialises
 * non-finite JavaScript numbers as strings. `SpecNumber` preserves that.
 */

export type SpecNumber = number | "NaN" | "Infinity" | "-Infinity";

export type Owner = "org" | "user";

/** An item of `GET /api/tools`. */
export interface ToolSummary {
  address: string;
  owner: Owner;
  integration: string;
  connection: string;
  name: string;
  pluginId: string;
  description: string;
  mayElicit?: boolean | null;
  requiresApproval?: boolean | null;
  approvalDescription?: string | null;
  static?: boolean | null;
}

/** `GET /api/tools/schema?address=...`. */
export interface ToolSchema {
  address: string;
  name?: string | null;
  description?: string | null;
  inputSchema?: unknown;
  outputSchema?: unknown;
  outputSchemaSource?: "observed" | null;
  outputSchemaObservations?: SpecNumber | null;
  schemaDefinitions?: Record<string, unknown> | null;
  inputTypeScript?: string | null;
  outputTypeScript?: string | null;
  typeScriptDefinitions?: Record<string, string> | null;
}

/**
 * An item of `GET /api/integrations`. `name` is Executor's own display name for
 * the integration, which is why this endpoint is preferred over deriving a name
 * from the slug.
 */
export interface Integration {
  slug: string;
  name: string;
  description: string;
  kind: string;
  canRemove: boolean;
  canRefresh: boolean;
  authMethods: { id: string; label: string; kind: string }[];
  /** The upstream API the integration talks to, not the product's own site. */
  displayUrl?: string | null;
  family?: string | null;
}

export type HealthStatus = "healthy" | "expired" | "misconfigured" | "degraded" | "unknown";

export type HealthReason =
  | "credential_missing"
  | "credential_refresh_rejected"
  | "blocked_by_admin"
  | "probe_timeout"
  | "probe_failed"
  | "upstream_status"
  | "tool_sync_failed";

/** `POST /api/connections/{owner}/{integration}/{name}/health`. */
export interface HealthResult {
  status: HealthStatus;
  httpStatus?: SpecNumber | null;
  identity?: string | null;
  checkedAt: SpecNumber;
  detail?: string | null;
  reason?: HealthReason | null;
  responseSample?: { path: string; value: string }[] | null;
}

/** An item of `GET /api/connections`. */
export interface Connection {
  owner: Owner;
  name: string;
  integration: string;
  template: string;
  provider: string;
  address: string;
  identityLabel?: string | null;
  description?: string | null;
  expiresAt?: SpecNumber | null;
  oauthClient?: string | null;
  oauthClientOwner?: Owner | null;
  oauthScope?: string | null;
  missingOAuthScopes: string[];
  lastHealth?: HealthResult | null;
}

/**
 * `POST /api/executions` and `POST /api/executions/{executionId}/resume`.
 *
 * A paused result means the run hit an approval gate or an elicitation and is
 * waiting on a decision. The spec types `structured` as unconstrained, so the
 * execution id has to be recovered from it - see `extractExecutionId`.
 */
export type ExecutionResult =
  | { status: "completed"; text: string; structured: unknown; isError: boolean }
  | { status: "paused"; text: string; structured: unknown };

export type ResumeAction = "accept" | "decline" | "cancel";

/** An item of `GET /api/artifacts`. */
export interface ArtifactSummary {
  id: string;
  owner: Owner;
  title: string;
  description: string | null;
  preview: { kind: "layout"; markup: string } | null;
  createdAt: SpecNumber;
  updatedAt: SpecNumber;
}

/** `GET /api/artifacts/{artifactId}` additionally returns the source. */
export interface Artifact extends ArtifactSummary {
  code: string;
  bindings?: Record<string, { integration: string; owner: Owner; connection: string }> | null;
}
