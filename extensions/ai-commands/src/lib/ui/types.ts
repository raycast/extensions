import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio";

export interface UiModelDetails {
  name: string;
  capabilities?: string[];
}

/* Mcp Server Config */
export interface McpServerConfig {
  mcpServers: Record<string, StdioServerParameters>;
}
