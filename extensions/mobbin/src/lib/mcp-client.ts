import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { appendDebugLog } from "./debug-log";
import {
  MobbinError,
  abortError,
  getErrorMessage,
  isAbortError,
  validateSearchQuery,
} from "./errors";
import {
  candidateKeys,
  extractMcpPayloads,
  normalizeFlows,
  normalizeScreens,
  normalizeSections,
} from "./normalize";
import { RaycastMcpOAuthProvider } from "./oauth-provider";
import { parseRetryAfterSeconds, withRateLimitRetry } from "./rate-limit";
import { createTimeoutSignal, waitForAbortable } from "./request";
import {
  MOBBIN_MCP_URL,
  type MobbinReference,
  type SearchCapabilities,
  type SearchClient,
  type SearchKind,
  type SearchOptions,
} from "./types";

type JsonSchemaProperty = {
  type?: unknown;
  enum?: unknown;
  minimum?: unknown;
  maximum?: unknown;
  default?: unknown;
};

type JsonSchemaObject = {
  properties?: Record<string, JsonSchemaProperty>;
  required?: unknown;
};

type McpConnection = {
  client: Client;
  transport: StreamableHTTPClientTransport;
};

const TOOL_NAMES: Record<SearchKind, string> = {
  screen: "search_screens",
  flow: "search_flows",
  section: "search_sections",
};
const SEARCH_TIMEOUT_MS = 60_000;

function isErrorResult(result: unknown): boolean {
  return Boolean(
    result &&
    typeof result === "object" &&
    (result as { isError?: unknown }).isError,
  );
}

function getMcpResultText(result: unknown): string | undefined {
  const content = (result as { content?: unknown })?.content;
  if (!Array.isArray(content)) return undefined;
  return content
    .filter(
      (item): item is { type: "text"; text: string } =>
        Boolean(item) &&
        typeof item === "object" &&
        (item as { type?: unknown }).type === "text" &&
        typeof (item as { text?: unknown }).text === "string",
    )
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function numericConstraint(
  schema: JsonSchemaObject,
  property: string,
  constraint: "minimum" | "maximum",
): number | undefined {
  const value = schema.properties?.[property]?.[constraint];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function enumValues(schema: JsonSchemaObject, property: string): string[] {
  const values = schema.properties?.[property]?.enum;
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string")
    : [];
}

export function buildMcpArguments(
  options: SearchOptions,
  schema: JsonSchemaObject,
): Record<string, unknown> {
  const properties = schema.properties ?? {};
  const args: Record<string, unknown> = {};
  const supports = (name: string) => name in properties;

  if (supports("query")) args.query = options.query;
  if (supports("platform")) args.platform = options.platform;

  if (supports("mode")) {
    const modes = enumValues(schema, "mode");
    if (modes.length === 0 || modes.includes(options.mode)) {
      args.mode = options.mode;
    } else if (options.mode === "standard" && modes.includes("fast")) {
      args.mode = "fast";
    }
  }

  if (supports("limit")) {
    const minimum =
      numericConstraint(schema, "limit", "minimum") ?? Number.NEGATIVE_INFINITY;
    const maximum =
      numericConstraint(schema, "limit", "maximum") ?? Number.POSITIVE_INFINITY;
    args.limit = Math.max(minimum, Math.min(options.limit, maximum));
  }

  if (supports("image_format")) {
    const formats = enumValues(schema, "image_format");
    if (formats.length === 0 || formats.includes(options.mcpImageFormat)) {
      args.image_format = options.mcpImageFormat;
    }
  }

  if (options.kind === "screen" && supports("exclude_screen_ids")) {
    args.exclude_screen_ids = options.excludeScreenIds;
  }
  return args;
}

function normalizePayloads(
  kind: SearchKind,
  payloads: unknown[],
  options: SearchOptions,
): MobbinReference[] {
  const seen = new Set<string>();
  return payloads.flatMap((payload) => {
    const references =
      kind === "screen"
        ? normalizeScreens(payload, options.platform, "mcp")
        : kind === "flow"
          ? normalizeFlows(payload, options.platform, "mcp")
          : normalizeSections(payload, "mcp");
    return references.filter((reference) => {
      const key = `${reference.kind}:${reference.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
}

function hasNonEmptyCandidates(kind: SearchKind, payload: unknown): boolean {
  if (Array.isArray(payload)) return payload.length > 0;
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const keys =
    kind === "screen"
      ? ["screens", "results", "items"]
      : kind === "flow"
        ? ["flows", "results", "items"]
        : ["sections", "results", "items"];
  if (
    keys.some(
      (key) =>
        Array.isArray(record[key]) && (record[key] as unknown[]).length > 0,
    )
  )
    return true;
  return ["data", "payload", "response", "structuredContent"].some((key) =>
    hasNonEmptyCandidates(kind, record[key]),
  );
}

function toMcpFailure(error: unknown): MobbinError {
  if (error instanceof MobbinError && error.code !== "mcp-error") return error;
  const record =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : undefined;
  const response =
    record?.response && typeof record.response === "object"
      ? (record.response as Record<string, unknown>)
      : undefined;
  const status =
    typeof record?.status === "number"
      ? record.status
      : typeof record?.statusCode === "number"
        ? record.statusCode
        : typeof record?.code === "number" && record.code >= 400
          ? record.code
          : typeof response?.status === "number"
            ? response.status
            : undefined;
  const message = getErrorMessage(error);
  const isRateLimited =
    status === 429 || /\b429\b|rate.?limit|too many requests/i.test(message);
  if (isRateLimited) {
    const headers = record?.headers ?? response?.headers;
    const retryAfterHeader =
      headers &&
      typeof headers === "object" &&
      "get" in headers &&
      typeof (headers as { get?: unknown }).get === "function"
        ? (
            headers as {
              get(name: string): string | null;
            }
          ).get("Retry-After")
        : headers && typeof headers === "object"
          ? (Object.entries(headers).find(
              ([name]) => name.toLowerCase() === "retry-after",
            )?.[1] as string | undefined)
          : undefined;
    const retryMatch = message.match(/retry(?:-after)?\D+(\d+)/i);
    const retryAfterSeconds =
      parseRetryAfterSeconds(retryAfterHeader ?? null) ??
      (retryMatch?.[1] ? Number(retryMatch[1]) : undefined);
    return new MobbinError("Mobbin rate limit exceeded.", "rate-limited", {
      ...(status === undefined ? {} : { status }),
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    });
  }
  if (status === 400 || /invalid (?:input|argument|parameter)/i.test(message))
    return new MobbinError(message, "bad-request", {
      ...(status === undefined ? {} : { status }),
    });
  if (status === 401)
    return new MobbinError(
      "Mobbin authorization expired. Reconnect your account.",
      "oauth-required",
      { status },
    );
  if (status === 403)
    return new MobbinError(message, "plan-required", { status });
  if (status !== undefined && status >= 500)
    return new MobbinError(message, "server-error", { status });
  return new MobbinError(message, "mcp-error", {
    ...(status === undefined ? {} : { status }),
  });
}

export class MobbinMcpClient implements SearchClient {
  private client: Client | undefined;
  private transport: StreamableHTTPClientTransport | undefined;
  private tools: Tool[] | undefined;
  private connecting: Promise<void> | undefined;
  private lifecycleGeneration = 0;

  constructor(private readonly provider = new RaycastMcpOAuthProvider()) {}

  async connect(signal?: AbortSignal): Promise<void> {
    if (this.client && this.transport) return;
    if (this.connecting) return this.connecting;
    const generation = this.lifecycleGeneration;
    const pending = this.establishConnection(signal).then(
      async ({ client, transport }) => {
        if (generation !== this.lifecycleGeneration) {
          await client.close().catch(() => undefined);
          await transport.close().catch(() => undefined);
          throw abortError();
        }
        this.client = client;
        this.transport = transport;
      },
    );
    this.connecting = pending;
    void pending
      .finally(() => {
        if (this.connecting === pending) this.connecting = undefined;
      })
      .catch(() => undefined);
    return pending;
  }

  async getCapabilities(signal?: AbortSignal): Promise<SearchCapabilities> {
    await this.connect(signal);
    let tools: Tool[];
    try {
      tools = await this.getTools(signal);
    } catch (error) {
      if (signal?.aborted) throw abortError(signal.reason);
      if (isAbortError(error)) throw error;
      await this.dispose();
      await this.connect(signal);
      try {
        tools = await this.getTools(signal);
      } catch (retryError) {
        await this.dispose();
        throw toMcpFailure(retryError);
      }
    }
    return {
      screen: tools.some((tool) => tool.name === TOOL_NAMES.screen),
      flow: tools.some((tool) => tool.name === TOOL_NAMES.flow),
      section: tools.some((tool) => tool.name === TOOL_NAMES.section),
    };
  }

  async search(
    options: SearchOptions,
    signal?: AbortSignal,
  ): Promise<MobbinReference[]> {
    const query = validateSearchQuery(options.query);
    const timeout = createTimeoutSignal(SEARCH_TIMEOUT_MS, signal);
    const normalizedOptions = { ...options, query };
    try {
      return await withRateLimitRetry(
        () => this.searchOnce(normalizedOptions, timeout.signal),
        timeout.signal,
      );
    } catch (error) {
      if (signal?.aborted) throw abortError(signal.reason);
      if (isAbortError(error)) throw error;
      if (
        timeout.signal.aborted &&
        timeout.signal.reason instanceof Error &&
        timeout.signal.reason.name === "TimeoutError"
      ) {
        await this.dispose();
        throw new MobbinError("Mobbin MCP search timed out.", "timeout");
      }
      const failure = toMcpFailure(error);
      if (
        [
          "oauth-required",
          "mcp-tool-not-found",
          "mcp-error",
          "contract-mismatch",
          "server-error",
        ].includes(failure.code)
      ) {
        await this.dispose();
      }
      throw failure;
    } finally {
      timeout.dispose();
    }
  }

  async dispose(): Promise<void> {
    this.lifecycleGeneration += 1;
    const client = this.client;
    const transport = this.transport;
    this.connecting = undefined;
    this.client = undefined;
    this.transport = undefined;
    this.tools = undefined;
    await client?.close().catch(() => undefined);
    await transport?.close().catch(() => undefined);
  }

  private async searchOnce(
    options: SearchOptions,
    signal: AbortSignal,
  ): Promise<MobbinReference[]> {
    await this.connect(signal);
    const client = this.client;
    if (!client)
      throw new MobbinError("Mobbin MCP is not connected.", "mcp-error");

    const tools = await this.getTools(signal);
    const tool = tools.find(
      (candidate) => candidate.name === TOOL_NAMES[options.kind],
    );
    if (!tool) {
      throw new MobbinError(
        `Mobbin MCP does not advertise ${TOOL_NAMES[options.kind]}.`,
        "mcp-tool-not-found",
      );
    }

    const schema = tool.inputSchema as unknown;
    validateToolSchema(tool, schema);
    const args = buildMcpArguments(options, schema);
    await appendDebugLog("mcp.search", {
      kind: options.kind,
      tool: tool.name,
      argumentKeys: Object.keys(args),
    });

    let result: unknown;
    try {
      result = await client.callTool(
        { name: tool.name, arguments: args },
        undefined,
        { signal },
      );
    } catch (error) {
      if (signal.aborted) throw abortError(signal.reason);
      if (isAbortError(error)) throw error;
      const mapped = toMcpFailure(error);
      if (mapped.code === "rate-limited") throw mapped;
      if (
        ![
          "oauth-required",
          "mcp-error",
          "network-error",
          "server-error",
        ].includes(mapped.code)
      )
        throw mapped;

      // Read-only searches are safe to retry once after a stale transport.
      await this.dispose();
      await this.connect(signal);
      const retryClient = this.client;
      if (!retryClient) throw mapped;
      const retryTools = await this.getTools(signal);
      const retryTool = retryTools.find(
        (candidate) => candidate.name === TOOL_NAMES[options.kind],
      );
      if (!retryTool) {
        throw new MobbinError(
          `Mobbin MCP no longer advertises ${TOOL_NAMES[options.kind]}.`,
          "mcp-tool-not-found",
        );
      }
      const retrySchema = retryTool.inputSchema as unknown;
      validateToolSchema(retryTool, retrySchema);
      const retryArgs = buildMcpArguments(options, retrySchema);
      try {
        result = await retryClient.callTool(
          { name: retryTool.name, arguments: retryArgs },
          undefined,
          { signal },
        );
      } catch (retryError) {
        if (signal.aborted) throw abortError(signal.reason);
        throw toMcpFailure(retryError);
      }
    }

    if (isErrorResult(result)) {
      const message =
        getMcpResultText(result) ?? "Mobbin rejected the search request.";
      throw toMcpFailure(
        new MobbinError(`Mobbin search error: ${message}`, "mcp-error"),
      );
    }

    const payloads = extractMcpPayloads(result);
    const references = normalizePayloads(options.kind, payloads, options);
    if (
      references.length === 0 &&
      payloads.some((payload) => hasNonEmptyCandidates(options.kind, payload))
    ) {
      throw new MobbinError(
        `Mobbin returned ${options.kind} results in an unsupported format.`,
        "contract-mismatch",
        { safeKeys: candidateKeys(payloads[0]) },
      );
    }
    return references;
  }

  private async getTools(signal?: AbortSignal): Promise<Tool[]> {
    if (this.tools) return this.tools;
    const client = this.client;
    if (!client)
      throw new MobbinError("Mobbin MCP is not connected.", "mcp-error");
    const result = await client.listTools(
      undefined,
      signal ? { signal } : undefined,
    );
    if (!result || !Array.isArray(result.tools)) {
      throw new MobbinError(
        "Mobbin returned an invalid MCP tool catalog.",
        "contract-mismatch",
        { safeKeys: candidateKeys(result) },
      );
    }
    this.tools = result.tools;
    return this.tools;
  }

  private async establishConnection(
    signal?: AbortSignal,
  ): Promise<McpConnection> {
    const initialClient = new Client({
      name: "mobbin-raycast",
      version: "1.0.0",
    });
    const initialTransport = new StreamableHTTPClientTransport(
      new URL(MOBBIN_MCP_URL),
      { authProvider: this.provider },
    );

    try {
      await initialClient.connect(
        initialTransport as never,
        signal ? { signal } : undefined,
      );
      return {
        client: initialClient,
        transport: initialTransport,
      };
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        await initialClient.close().catch(() => undefined);
        await initialTransport.close().catch(() => undefined);
        if (signal?.aborted) throw abortError(signal.reason);
        if (isAbortError(error)) throw error;
        throw toMcpFailure(error);
      }

      const authorizationCode = this.provider.takeAuthorizationCode();
      if (!authorizationCode) {
        await initialClient.close().catch(() => undefined);
        await initialTransport.close().catch(() => undefined);
        throw new MobbinError(
          "Connect your Mobbin account to continue.",
          "oauth-required",
        );
      }

      try {
        await waitForAbortable(
          initialTransport.finishAuth(authorizationCode),
          signal,
        );
      } finally {
        await initialClient.close().catch(() => undefined);
        await initialTransport.close().catch(() => undefined);
      }

      const retryClient = new Client({
        name: "mobbin-raycast",
        version: "1.0.0",
      });
      const retryTransport = new StreamableHTTPClientTransport(
        new URL(MOBBIN_MCP_URL),
        { authProvider: this.provider },
      );
      try {
        await retryClient.connect(
          retryTransport as never,
          signal ? { signal } : undefined,
        );
        return {
          client: retryClient,
          transport: retryTransport,
        };
      } catch (retryError) {
        await retryClient.close().catch(() => undefined);
        await retryTransport.close().catch(() => undefined);
        if (signal?.aborted) throw abortError(signal.reason);
        if (isAbortError(retryError)) throw retryError;
        throw toMcpFailure(retryError);
      }
    }
  }
}

function validateToolSchema(
  tool: Tool,
  schema: unknown,
): asserts schema is JsonSchemaObject {
  const properties =
    schema && typeof schema === "object" && !Array.isArray(schema)
      ? (schema as JsonSchemaObject).properties
      : undefined;
  if (
    !properties ||
    typeof properties !== "object" ||
    Array.isArray(properties) ||
    !("query" in properties)
  ) {
    throw new MobbinError(
      `${tool.name} does not advertise a compatible query input.`,
      "contract-mismatch",
      {
        safeKeys: properties ? Object.keys(properties).slice(0, 20) : [],
      },
    );
  }
}
