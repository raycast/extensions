export interface McpFile {
  name: string;
  content: string;
  filePath: string;
  description?: string;
}

export interface McpContent {
  mcpServers?: Record<
    string,
    {
      tools: Array<{
        name: string;
        description?: string;
        parameters?: Record<string, unknown>;
      }>;
    }
  >;
  description?: string;
}

export interface Agent {
  name: string;
  files: Array<{
    name: string;
    content: McpContent;
  }>;
  description?: string;
}
