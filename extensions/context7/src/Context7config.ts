export type ClientInfo = {
  type: string;
  path?: string;
  command?: {
    command: string;
    args: string[];
  };
  name: string;
  ready: boolean;
};

export function getClients(): ClientInfo[] {
  // Hardcoded configuration for the context7 MCP server
  const context7Client: ClientInfo = {
    type: "command",
    command: {
      command: "npx",
      args: ["@upstash/context7-mcp@latest"],
    },
    name: "context7",
    ready: true,
  };

  return [context7Client];
}
