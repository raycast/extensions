import { createHash } from "node:crypto";
import {
  defaultOwner,
  execute,
  getArtifact,
  getToolSchema,
  listArtifacts,
  listConnections,
  listIntegrations,
  listTools,
  request,
  resumeExecution,
} from "./client";
import { consoleUrl } from "./console";
import { connectedTools } from "./tool-availability";
import { executionFailed, executionValue, pausedInteraction, record, toolCallCode } from "./execution";
import type { ExecutionResult, Owner, ResumeAction } from "./types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export interface DiscoverToolsInput {
  /** Search words for tool name, address, or description. Required unless integration is provided. */
  query?: string;
  /** Exact Executor integration slug. Required unless query is provided. */
  integration?: string;
  /** Maximum results to return. Defaults to 20 and is capped at 50. */
  limit?: number;
  /** Zero-based offset returned as nextOffset by a previous call. */
  offset?: number;
}

export interface DescribeToolInput {
  /** Exact address returned by discover-tools. */
  address: string;
}

export interface CallToolInput {
  /** Exact address returned by discover-tools. */
  address: string;
  /** Tool arguments as a JSON object string. Use "{}" when the tool takes no arguments. */
  argumentsJson: string;
  includeFullResponse?: boolean;
}

export interface ExecuteCodeInput {
  /** TypeScript code to execute in Executor's sandbox. */
  code: string;
  includeFullResponse?: boolean;
}

export interface ResumeExecutionInput {
  /** Exact execution identifier returned by a paused Executor call. */
  executionId: string;
  /** Fingerprint returned with the same paused execution. */
  pauseFingerprint: string;
  /** Human decision for this paused execution. */
  action: ResumeAction;
  /** JSON object matching requestedSchema when the pause asks for input. */
  contentJson?: string;
  includeFullResponse?: boolean;
}

export interface ListConnectionsInput {
  /** Optional exact integration slug. */
  integration?: string;
  /** Optional Executor owner scope. Uses the extension preference when omitted. */
  owner?: Owner;
  /** Maximum results to return. Defaults to 20 and is capped at 50. */
  limit?: number;
  /** Zero-based offset returned as nextOffset by a previous call. */
  offset?: number;
}

export interface ListArtifactsInput {
  /** Maximum results to return. Defaults to 20 and is capped at 50. */
  limit?: number;
  /** Zero-based offset returned as nextOffset by a previous call. */
  offset?: number;
}

export interface GetArtifactInput {
  /** Exact artifact identifier returned by list-artifacts. */
  artifactId: string;
}

export interface ConfirmationDetails {
  message: string;
  info?: { name: string; value?: string }[];
}

interface PausedDetails {
  text: string;
  structured: unknown;
}

function nonEmpty(value: string | undefined, label: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  return trimmed;
}

function resultLimit(value: number | undefined): number {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!Number.isInteger(value) || value < 1) throw new Error("Limit must be a positive whole number.");
  return Math.min(value, MAX_LIMIT);
}

function resultOffset(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || value < 0) throw new Error("Offset must be a non-negative whole number.");
  return value;
}

function page<T>(items: T[], limit: number, offset: number) {
  const selected = items.slice(offset, offset + limit);
  const nextOffset = offset + selected.length < items.length ? offset + selected.length : undefined;
  return {
    returned: selected.length,
    totalMatched: items.length,
    offset,
    nextOffset,
    truncated: nextOffset !== undefined,
    items: selected,
  };
}

export function parseArgumentsJson(value: string, label = "Arguments"): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  const object = record(parsed);
  if (!object) throw new Error(`${label} must be a JSON object.`);
  return object;
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

export function pauseFingerprint(interaction: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalJson(interaction)).digest("hex");
}

function pausedOutput(result: ExecutionResult) {
  const paused = pausedInteraction(result);
  if (!paused) throw new Error("Executor returned a pause without an exact execution identifier and server terms.");
  return {
    status: "paused" as const,
    text: result.text,
    executionId: paused.executionId,
    pauseFingerprint: pauseFingerprint(paused.interaction),
    interaction: paused.interaction,
    nextStep:
      "Show the server-provided interaction terms to the user. Call resume-execution only after the user chooses an action, using this executionId and pauseFingerprint.",
  };
}

export function executionOutput(result: ExecutionResult, includeFullResponse = false) {
  const fullResponse = includeFullResponse ? { fullResponse: result } : {};
  if (result.status === "paused") return { ...pausedOutput(result), ...fullResponse };
  return {
    ...fullResponse,
    status: "completed" as const,
    text: result.text,
    result: executionValue(result),
    isError: executionFailed(result),
  };
}

async function readPaused(executionId: string) {
  const exactId = nonEmpty(executionId, "Execution ID");
  const detail = await request<PausedDetails>(`/api/executions/${encodeURIComponent(exactId)}`);
  const paused = pausedInteraction({ status: "paused", text: detail.text, structured: detail.structured });
  if (!paused || paused.executionId !== exactId) {
    throw new Error("Executor did not return matching server-stored terms for this paused execution.");
  }
  return { detail, interaction: paused.interaction, fingerprint: pauseFingerprint(paused.interaction) };
}

export async function readExecutorApproval(executionId: string) {
  const { detail } = await readPaused(executionId);
  return executionOutput({ status: "paused", text: detail.text, structured: detail.structured });
}

async function matchingPause(input: ResumeExecutionInput) {
  if (!["accept", "decline", "cancel"].includes(input.action)) {
    throw new Error("Resume action must be accept, decline, or cancel.");
  }
  const expected = nonEmpty(input.pauseFingerprint, "Pause fingerprint");
  const paused = await readPaused(input.executionId);
  if (paused.fingerprint !== expected) {
    throw new Error("The paused execution terms changed. Use the latest Executor pause before choosing an action.");
  }
  return paused;
}

function requestedSchema(interaction: Record<string, unknown>): Record<string, unknown> | undefined {
  const schema = record(interaction.requestedSchema);
  return schema && Object.keys(schema).length > 0 ? schema : undefined;
}

function resumeContent(input: ResumeExecutionInput, interaction?: Record<string, unknown>) {
  const content = input.contentJson === undefined ? undefined : parseArgumentsJson(input.contentJson, "Content");
  if (input.action === "accept" && interaction) {
    if (!["form", "url"].includes(String(interaction.kind))) {
      throw new Error("This paused execution has an unknown interaction kind and cannot be accepted here.");
    }
    if (interaction.kind === "url" && content !== undefined) {
      throw new Error("A browser continuation does not accept response content.");
    }
    if (requestedSchema(interaction) && content === undefined) {
      throw new Error("This paused execution requires content matching the server-provided requested schema.");
    }
  }
  return content;
}

export async function discoverExecutorTools(input: DiscoverToolsInput) {
  const query = input.query?.trim() || undefined;
  const integration = input.integration?.trim() || undefined;
  if (!query && !integration) throw new Error("Provide a search query or an exact integration slug.");
  const limit = resultLimit(input.limit);
  const offset = resultOffset(input.offset);
  const owner = defaultOwner();
  const [catalog, connections] = await Promise.all([
    listTools({ query, integration, owner }),
    listConnections({ integration, owner }),
  ]);
  const matches = connectedTools(catalog, connections);
  const { items, ...pagination } = page(matches, limit, offset);
  return {
    ...pagination,
    tools: items,
  };
}

export async function describeExecutorTool(input: DescribeToolInput) {
  return getToolSchema(nonEmpty(input.address, "Tool address"));
}

export function callToolConfirmation(input: CallToolInput): ConfirmationDetails {
  const address = nonEmpty(input.address, "Tool address");
  const args = parseArgumentsJson(input.argumentsJson);
  return {
    message: "Run this tool through Executor? Executor may apply an additional server-side approval gate.",
    info: [
      { name: "Tool", value: address },
      { name: "Arguments", value: pretty(args) },
    ],
  };
}

export async function callExecutorTool(input: CallToolInput) {
  const address = nonEmpty(input.address, "Tool address");
  const args = parseArgumentsJson(input.argumentsJson);
  return executionOutput(await execute(toolCallCode(address, args)), input.includeFullResponse);
}

export function executeCodeConfirmation(input: ExecuteCodeInput): ConfirmationDetails {
  const code = nonEmpty(input.code, "Code");
  return {
    message: "Execute this code in Executor's sandbox? Connected tools may still require server-side approval.",
    info: [{ name: "Code", value: code }],
  };
}

export async function executeExecutorCode(input: ExecuteCodeInput) {
  return executionOutput(await execute(nonEmpty(input.code, "Code")), input.includeFullResponse);
}

export async function resumeExecutionConfirmation(input: ResumeExecutionInput): Promise<ConfirmationDetails> {
  const paused = await matchingPause(input);
  const content = resumeContent(input, paused.interaction);
  return {
    message: paused.detail.text,
    info: [
      { name: "Action", value: input.action },
      { name: "Server Terms", value: pretty(paused.interaction) },
      { name: "Response", value: content === undefined ? undefined : pretty(content) },
    ],
  };
}

export async function resumeExecutorExecution(input: ResumeExecutionInput) {
  const paused = await matchingPause(input);
  const content = resumeContent(input, paused.interaction);
  const result = await resumeExecution(nonEmpty(input.executionId, "Execution ID"), input.action, content);
  return executionOutput(result, input.includeFullResponse);
}

export async function listExecutorIntegrations() {
  return { integrations: await listIntegrations() };
}

export async function listExecutorConnections(input: ListConnectionsInput) {
  const limit = resultLimit(input.limit);
  const offset = resultOffset(input.offset);
  const connections = await listConnections({
    integration: input.integration?.trim() || undefined,
    owner: input.owner ?? defaultOwner(),
  });
  const { items, ...pagination } = page(connections, limit, offset);
  return {
    ...pagination,
    connections: items,
  };
}

export async function listExecutorArtifacts(input: ListArtifactsInput) {
  const limit = resultLimit(input.limit);
  const offset = resultOffset(input.offset);
  const artifacts = (await listArtifacts()).map((artifact) => ({
    id: artifact.id,
    owner: artifact.owner,
    title: artifact.title,
    description: artifact.description,
    hasPreview: artifact.preview !== null,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
  }));
  const { items, ...pagination } = page(artifacts, limit, offset);
  return {
    ...pagination,
    artifacts: items,
  };
}

export async function getExecutorArtifact(input: GetArtifactInput) {
  const artifactId = nonEmpty(input.artifactId, "Artifact ID");
  const artifact = await getArtifact(artifactId);
  try {
    return {
      ...artifact,
      url: await consoleUrl(`/artifacts/${encodeURIComponent(artifactId)}`),
    };
  } catch (error) {
    return {
      ...artifact,
      linkUnavailable: error instanceof Error ? error.message : "Executor console link unavailable.",
    };
  }
}
