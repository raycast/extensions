import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio";

// Mcp Server Config.
export interface McpServerConfig {
  mcpServers: McpServerParams;
}

// Mcp Server Parameters. Only stdio transport supported.
export interface McpServerParams {
  [name: string]: StdioServerParameters;
}

export interface McpServerToolInputSchema {
  type: string;
  properties?: {
    [key: string]: {
      type: string;
      description?: string;
      items?: { enum?: string[] };
    };
  };
  required?: string[];
}

export interface McpServerTool {
  name: string;
  description?: string;
  inputSchema: McpServerToolInputSchema;
}

export interface McpToolInfo {
  /* Mcp Server name */
  server: string;
  /* Function name */
  function: string;
  /* Arguments */
  arguments: {
    [name: string]: unknown;
  };
}
