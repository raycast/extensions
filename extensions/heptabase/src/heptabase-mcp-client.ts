import { getAccessToken } from "./heptabase-oauth";

const HEPTABASE_MCP_URL = "https://api.heptabase.com/mcp";

/**
 * MCP JSON-RPC request base structure
 */
interface MCPRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

/**
 * MCP JSON-RPC response base structure
 */
interface MCPResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Tool definition
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Resource definition
 */
export interface MCPResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP response types for specific methods
 */
interface MCPToolsListResult {
  tools: MCPTool[];
}

interface MCPResourcesListResult {
  resources: MCPResource[];
}

interface MCPPromptsListResult {
  prompts: Array<Record<string, unknown>>;
}

/**
 * Heptabase MCP Client
 * Directly call MCP API using HTTP POST, without depending on MCP SDK
 */
export class HeptabaseMCPClient {
  private requestId = 1;

  /**
   * Send MCP request
   */
  private async request(method: string, params: Record<string, unknown> = {}, retry = true): Promise<unknown> {
    const token = await getAccessToken();

    const mcpRequest: MCPRequest = {
      jsonrpc: "2.0",
      id: this.requestId++,
      method,
      params,
    };

    const response = await fetch(HEPTABASE_MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // MCP server requires accepting both, but we prefer JSON (q=1.0 is default)
        // SSE is for streaming, which Raycast can't handle in stateless commands
        Accept: "application/json, text/event-stream;q=0.1",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(mcpRequest),
    });

    // Handle 401 Unauthorized - token might be expired
    if (response.status === 401 && retry) {
      // Clear the token cache and retry once
      const { heptabaseOAuthClient } = await import("./heptabase-oauth");
      await heptabaseOAuthClient.removeTokens();
      return this.request(method, params, false);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`MCP request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`MCP request failed: ${response.status} ${response.statusText}`);
    }

    // Check if response is SSE format or JSON
    const contentType = response.headers.get("content-type") || "";
    let mcpResponse: MCPResponse;

    if (contentType.includes("text/event-stream")) {
      // Parse SSE format: extract JSON from "data:" field
      const text = await response.text();
      const dataMatch = text.match(/^data: (.+)$/m);

      if (!dataMatch) {
        console.error("Invalid SSE format:", text);
        throw new Error("Invalid SSE response format");
      }

      mcpResponse = JSON.parse(dataMatch[1]) as MCPResponse;
    } else {
      // Regular JSON response
      mcpResponse = (await response.json()) as MCPResponse;
    }

    if (mcpResponse.error) {
      console.error("MCP error:", mcpResponse.error);
      throw new Error(`MCP error: ${mcpResponse.error.message}`);
    }

    return mcpResponse.result;
  }

  /**
   * Initialize connection (optional, for testing)
   */
  async initialize(): Promise<unknown> {
    return await this.request("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: {
        name: "raycast-heptabase-extension",
        version: "1.0.0",
      },
    });
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<MCPTool[]> {
    const result = (await this.request("tools/list", {})) as MCPToolsListResult;
    return result.tools || [];
  }

  /**
   * Call a specific tool
   */
  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const result = await this.request("tools/call", {
      name,
      arguments: args,
    });
    return result;
  }

  /**
   * List all available resources
   */
  async listResources(): Promise<MCPResource[]> {
    const result = (await this.request("resources/list", {})) as MCPResourcesListResult;
    return result.resources || [];
  }

  /**
   * Read a specific resource
   */
  async readResource(uri: string): Promise<unknown> {
    const result = await this.request("resources/read", { uri });
    return result;
  }

  /**
   * List all available prompts
   */
  async listPrompts(): Promise<Array<Record<string, unknown>>> {
    const result = (await this.request("prompts/list", {})) as MCPPromptsListResult;
    return result.prompts || [];
  }

  /**
   * Get a specific prompt
   */
  async getPrompt(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const result = await this.request("prompts/get", {
      name,
      arguments: args,
    });
    return result;
  }
}

// Singleton pattern
let clientInstance: HeptabaseMCPClient | null = null;

/**
 * Get Heptabase MCP Client instance
 */
export function getHeptabaseMCPClient(): HeptabaseMCPClient {
  if (!clientInstance) {
    clientInstance = new HeptabaseMCPClient();
  }
  return clientInstance;
}
