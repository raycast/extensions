import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path/posix";

export type MCPClient = {
  title: string;
  bundleId: string;
  config: {
    path: string;
    supportedTransports: Array<"stdio" | "sse">;
  };
};

export type MCPConfig = {
  mcpServers: Record<string, MCPServerConfig>;
};

export type MCPServerConfig = {
  command: string;
  args: string[];
  env?: Record<string, string>;
};

export const SUPPORTED_CLIENTS: MCPClient[] = [
  {
    title: "Claude",
    bundleId: "com.anthropic.claudefordesktop",
    config: {
      path: join(homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json"),
      supportedTransports: ["stdio"],
    },
  },
  {
    title: "Cursor",
    bundleId: "com.todesktop.230313mzl4w4u92",
    config: {
      path: join(homedir(), ".cursor", "mcp.json"),
      supportedTransports: ["stdio", "sse"],
    },
  },
  {
    title: "Windsurf",
    bundleId: "com.exafunction.windsurf",
    config: {
      path: join(homedir(), ".codeium", "windsurf", "mcp_config.json"),
      supportedTransports: ["stdio", "sse"],
    },
  },
];

export function writeMCPConfig(client: MCPClient, additionalConfig: MCPConfig) {
  const configDir = dirname(client.config.path);

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  let existingConfig: MCPConfig = {
    mcpServers: {},
  };

  if (existsSync(client.config.path)) {
    existingConfig = JSON.parse(readFileSync(client.config.path, "utf8"));
  }

  // Deep merge mcpServers, shallow merge other fields
  const mergedConfig = {
    ...existingConfig,
    ...additionalConfig,
    mcpServers: {
      ...(existingConfig.mcpServers || {}),
      ...(additionalConfig.mcpServers || {}),
    },
  };

  writeFileSync(client.config.path, JSON.stringify(mergedConfig, null, 2));
}
