export type JsonObject = Record<string, unknown>;

export interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: JsonObject;
  outputSchema?: JsonObject;
}

export interface McpToolPage {
  tools: McpToolDefinition[];
  nextCursor?: string;
}

export type McpToolCallResult =
  | { hasStructuredContent: false }
  | { hasStructuredContent: true; structuredContent: unknown };

export interface McpRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface McpClientPort {
  listTools(options?: McpRequestOptions): Promise<McpToolDefinition[]>;
  callTool(name: string, arguments_: JsonObject, options?: McpRequestOptions): Promise<McpToolCallResult>;
  close(): Promise<void>;
}
