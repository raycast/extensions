import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { appendDebugLog } from "./debug-log";
import { MobbinError, getErrorMessage } from "./errors";
import { findScreensInMcpResult, normalizeScreens } from "./normalize";
import { RaycastMcpOAuthProvider } from "./oauth-provider";
import {
  MOBBIN_MCP_URL,
  type SearchClient,
  type SearchOptions,
  type Screen,
} from "./types";

type JsonSchemaObject = {
  properties?: Record<string, unknown>;
  required?: unknown;
};

// An MCP tool result with isError set is a failed call, not data. The tool returns the failure
// reason as text content (e.g. input-validation errors); surface it instead of treating it as 0 results.
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
  const textItem = content.find(
    (item) =>
      item &&
      typeof item === "object" &&
      (item as { type?: unknown }).type === "text",
  ) as { text?: unknown } | undefined;
  return typeof textItem?.text === "string" ? textItem.text : undefined;
}

// The search_screens tool constrains `limit` (currently max 30); read the cap from the tool's own
// input schema so we clamp correctly and stay correct if Mobbin changes it.
function readMaxLimit(
  toolSchema: JsonSchemaObject | undefined,
): number | undefined {
  const limitSchema = toolSchema?.properties?.limit as
    { maximum?: unknown } | undefined;
  return typeof limitSchema?.maximum === "number"
    ? limitSchema.maximum
    : undefined;
}

// Map our image_quality preference onto the tool's `image_format` enum, but only return a value that
// is actually in the enum — otherwise omit it so we never re-trigger an input-validation error.
function pickImageFormat(
  toolSchema: JsonSchemaObject | undefined,
  imageQuality: string,
): string | undefined {
  const formatSchema = toolSchema?.properties?.image_format as
    { enum?: unknown } | undefined;
  const values = Array.isArray(formatSchema?.enum)
    ? formatSchema!.enum.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  if (values.length === 0) return undefined;
  if (values.includes(imageQuality)) return imageQuality;
  return values.find((value) =>
    value.toLowerCase().includes(imageQuality.toLowerCase()),
  );
}

// Compact, sanitized shape summary of an MCP tool result, logged only when a search yields no
// screens. Reveals whether Mobbin returned data we failed to parse vs. genuinely returned nothing.
function describeMcpResult(
  result: unknown,
  extracted: unknown,
): Record<string, unknown> {
  const envelope = result as
    | { content?: unknown; structuredContent?: unknown; isError?: unknown }
    | undefined;
  const content = Array.isArray(envelope?.content)
    ? (envelope!.content as unknown[])
    : [];
  const candidates = Array.isArray(extracted)
    ? extracted
    : extracted &&
        typeof extracted === "object" &&
        Array.isArray((extracted as { screens?: unknown }).screens)
      ? (extracted as { screens: unknown[] }).screens
      : [];

  return {
    isError: Boolean(envelope?.isError),
    resultKeys:
      envelope && typeof envelope === "object"
        ? Object.keys(envelope)
        : typeof result,
    contentLength: content.length,
    contentTypes: content.map((item) =>
      item && typeof item === "object"
        ? (item as { type?: unknown }).type
        : typeof item,
    ),
    hasStructuredContent: Boolean(envelope?.structuredContent),
    extractedType: Array.isArray(extracted) ? "array" : typeof extracted,
    candidateCount: candidates.length,
    firstCandidateKeys:
      candidates[0] && typeof candidates[0] === "object"
        ? Object.keys(candidates[0] as object)
        : undefined,
    textSample: getMcpResultText(result)?.slice(0, 600),
  };
}

export class MobbinMcpClient implements SearchClient {
  constructor(private readonly provider = new RaycastMcpOAuthProvider()) {}

  async searchScreens(options: SearchOptions): Promise<Screen[]> {
    await appendDebugLog("mcp.search.start", {
      queryLength: options.query.length,
      platform: options.platform,
      mode: options.mode,
      limit: options.limit,
    });
    const { client, transport } = await this.connect();
    try {
      const tool = await this.findSearchTool(client);
      const toolSchema = tool.inputSchema as JsonSchemaObject | undefined;
      const maxLimit = readMaxLimit(toolSchema) ?? 30;
      const limit = Math.min(options.limit, maxLimit);
      const imageFormat = pickImageFormat(toolSchema, options.image_quality);
      await appendDebugLog("mcp.search.tool.selected", {
        toolName: tool.name,
        inputProperties: toolSchema?.properties
          ? Object.keys(toolSchema.properties)
          : undefined,
        maxLimit,
        requestedLimit: options.limit,
        effectiveLimit: limit,
        imageFormat,
        description:
          typeof tool.description === "string"
            ? tool.description.slice(0, 500)
            : undefined,
      });
      const result = await client.callTool({
        name: tool.name,
        arguments: {
          query: options.query,
          platform: options.platform,
          mode: options.mode,
          limit,
          ...(imageFormat ? { image_format: imageFormat } : {}),
          exclude_screen_ids: options.exclude_screen_ids,
        },
      });

      if (isErrorResult(result)) {
        const message =
          getMcpResultText(result) ?? "Mobbin rejected the search request.";
        await appendDebugLog("mcp.search.tool-error", {
          message: message.slice(0, 600),
        });
        throw new MobbinError(`Mobbin search error: ${message}`, "mcp-error");
      }

      const extracted = findScreensInMcpResult(result);
      const screens = normalizeScreens(extracted, options.platform, "mcp");
      if (screens.length === 0) {
        await appendDebugLog(
          "mcp.search.empty-diagnostic",
          describeMcpResult(result, extracted),
        );
      }
      await appendDebugLog("mcp.search.success", { count: screens.length });
      return screens;
    } catch (error) {
      await appendDebugLog("mcp.search.failure", { error });
      if (error instanceof MobbinError) throw error;
      throw new MobbinError(getErrorMessage(error), "mcp-error");
    } finally {
      await transport.close().catch(() => undefined);
    }
  }

  private async connect(): Promise<{
    client: Client;
    transport: StreamableHTTPClientTransport;
  }> {
    await appendDebugLog("mcp.connect.start", { url: MOBBIN_MCP_URL });
    const client = new Client({ name: "mobbin-raycast", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(MOBBIN_MCP_URL),
      {
        authProvider: this.provider,
      },
    );

    try {
      await client.connect(transport as never);
      await appendDebugLog("mcp.connect.success.initial");
      return { client, transport };
    } catch (error) {
      await appendDebugLog("mcp.connect.failure.initial", {
        isUnauthorized: error instanceof UnauthorizedError,
        error,
      });
      if (!(error instanceof UnauthorizedError)) {
        throw new MobbinError(getErrorMessage(error), "oauth-required");
      }

      const authorizationCode = this.provider.takeAuthorizationCode();
      await appendDebugLog("mcp.connect.authorization-code", {
        hasAuthorizationCode: Boolean(authorizationCode),
      });
      if (!authorizationCode) {
        throw new MobbinError(
          "Mobbin OAuth authorization did not return a code.",
          "oauth-required",
        );
      }

      await appendDebugLog("mcp.finish-auth.start");
      await transport.finishAuth(authorizationCode);
      await appendDebugLog("mcp.finish-auth.success");
      await transport.close().catch(() => undefined);

      const retryClient = new Client({
        name: "mobbin-raycast",
        version: "0.1.0",
      });
      const retryTransport = new StreamableHTTPClientTransport(
        new URL(MOBBIN_MCP_URL),
        {
          authProvider: this.provider,
        },
      );
      await retryClient.connect(retryTransport as never);
      await appendDebugLog("mcp.connect.success.retry");
      return { client: retryClient, transport: retryTransport };
    }
  }

  private async findSearchTool(client: Client): Promise<Tool> {
    const { tools } = await client.listTools();
    const preferred = tools.find((tool) =>
      /(^|[_-])search([_-]|$).*screens?|screens?.*(^|[_-])search([_-]|$)/i.test(
        tool.name,
      ),
    );
    if (preferred) return preferred;

    const schemaMatch = tools.find((tool) => {
      const schema = tool.inputSchema as JsonSchemaObject | undefined;
      return Boolean(schema?.properties && "query" in schema.properties);
    });
    if (schemaMatch) return schemaMatch;

    throw new MobbinError(
      "Mobbin MCP search tool not found.",
      "mcp-tool-not-found",
    );
  }
}
