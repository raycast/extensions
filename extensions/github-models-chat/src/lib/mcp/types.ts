import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio";

// Mcp Server Config.
export interface McpServerConfig {
  mcpServers: McpServerParams;
}

// Mcp Server Parameters. Only stdio transport supported.
export interface McpServerParams {
  [name: string]: StdioServerParameters;
}

export interface McpServerTool {
  name: string;
  description?: string;
  inputSchema: any;
}

export interface McpToolInfo {
  /* Mcp Server name */
  server: string;
  /* Function name */
  function: string;
  /* Arguments */
  arguments: {
    [name: string]: any;
  };
}
