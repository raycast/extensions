// Profile types
export interface Profile {
  id: string;
  name: string;
  description?: string;
  config: ClaudeCodeConfig;
  createdAt: string;
  updatedAt: string;
  isActive?: boolean;
}

// Claude Code configuration structure
export interface ClaudeCodeConfig {
  apiKey?: string;
  model?: string;
  customInstructions?: string;
  mcpServers?: McpServers;
  [key: string]: unknown; // Allow other config properties
}

// MCP Server types
export interface McpServers {
  [serverName: string]: McpServerConfig;
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
  transportType?: "stdio" | "http" | "sse";
  url?: string; // For HTTP/SSE transport
}

// Storage types
export interface ProfileStorage {
  profiles: Profile[];
  activeProfileId?: string;
}

// Form data types
export interface ProfileFormValues {
  name: string;
  description: string;
  apiKey: string;
  model: string;
  customInstructions: string;
}

export interface McpServerFormValues {
  name: string;
  command: string;
  args: string;
  env: string;
  transportType: "stdio" | "http" | "sse";
  url: string;
  disabled: boolean;
}
