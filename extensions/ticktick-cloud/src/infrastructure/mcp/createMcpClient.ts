import {
  Client,
  StreamableHTTPClientTransport,
  type CallToolRequestOptions,
  type RequestOptions,
  type StreamableHTTPClientTransportOptions,
  type Tool,
} from "@modelcontextprotocol/client";
import { z } from "zod";
import type { AuthProvider } from "../auth/AuthProvider";
import { MCP_RESOURCE } from "../auth/oauthMetadata";
import {
  assertMcpAuthTarget,
  connectAuthenticatedMcpClient,
  createSafeMcpFetch,
  type McpSdkClientPort,
  type SdkToolCallResult,
} from "./authenticatedFetch";
import type { JsonObject, McpClientPort, McpRequestOptions, McpToolDefinition, McpToolPage } from "./McpClientPort";

const jsonObjectSchema = z.record(z.string(), z.unknown());
const toolDefinitionSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    inputSchema: jsonObjectSchema,
    outputSchema: jsonObjectSchema.optional(),
  })
  .loose();
const toolPageSchema = z
  .object({
    tools: z.array(toolDefinitionSchema),
    nextCursor: z.string().min(1).optional(),
  })
  .loose();

export function createMcpTransportOptions(
  auth: AuthProvider,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now
): StreamableHTTPClientTransportOptions {
  assertMcpAuthTarget(auth);
  return {
    authProvider: { token: () => auth.getAccessToken() },
    onInsufficientScope: "throw",
    requestInit: { redirect: "error" },
    fetch: createSafeMcpFetch(fetchImpl, now),
  };
}

export function createMcpTransport(
  auth: AuthProvider,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now
): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(MCP_RESOURCE), createMcpTransportOptions(auth, fetchImpl, now));
}

export class ModelContextProtocolSdkClient implements McpSdkClientPort {
  constructor(private readonly client: Client, private readonly transport: StreamableHTTPClientTransport) {}

  async connect(options?: McpRequestOptions): Promise<void> {
    await this.client.connect(this.transport, toSdkRequestOptions(options));
  }

  async listToolsPage(cursor?: string, options?: McpRequestOptions): Promise<McpToolPage> {
    const request =
      cursor === undefined ? { method: "tools/list" as const } : { method: "tools/list" as const, params: { cursor } };
    const page = await this.client.request(request, toolPageSchema, toSdkRequestOptions(options));
    return {
      tools: page.tools.map(({ name, description, inputSchema, outputSchema }) => ({
        name,
        ...(description === undefined ? {} : { description }),
        inputSchema,
        ...(outputSchema === undefined ? {} : { outputSchema }),
      })),
      ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
    };
  }

  async callTool(
    name: string,
    arguments_: JsonObject,
    definition?: McpToolDefinition,
    options?: McpRequestOptions
  ): Promise<SdkToolCallResult> {
    const requestOptions = toSdkRequestOptions(options);
    const sdkOptions: CallToolRequestOptions | undefined =
      definition === undefined && requestOptions === undefined
        ? undefined
        : {
            ...(definition === undefined ? {} : { toolDefinition: definition as Tool }),
            ...requestOptions,
          };
    const result = await this.client.callTool({ name, arguments: arguments_ }, sdkOptions);
    return {
      isError: result.isError,
      content: result.content,
      ...(result.structuredContent === undefined ? {} : { structuredContent: result.structuredContent }),
    };
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export async function createMcpClient(auth: AuthProvider, options?: McpRequestOptions): Promise<McpClientPort> {
  const client = new Client({ name: "raycast-ticktick", version: "1.0.0" });
  const sdk = new ModelContextProtocolSdkClient(client, createMcpTransport(auth));
  return connectAuthenticatedMcpClient(auth, sdk, options);
}

function toSdkRequestOptions(options?: McpRequestOptions): RequestOptions | undefined {
  if (!options) return undefined;
  return {
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.timeoutMs === undefined ? {} : { timeout: options.timeoutMs }),
  };
}
