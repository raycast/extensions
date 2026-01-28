import { McpServerConfig } from "../../mcp/types";

/**
 * Delete Mcp Server Config from LocalStorage.
 * @param name - Mcp Server Config Name.
 * @param value - Mcp Server Config.
 * @param setValue - Function used for set Mcp Server Config.
 */
export async function DeleteMcpServer(
  name: string,
  value: McpServerConfig,
  setValue: (value: McpServerConfig) => Promise<void>
): Promise<void> {
  const oldConfig: McpServerConfig = structuredClone(value);
  delete oldConfig.mcpServers[name];
  await setValue(oldConfig);
}

/**
 * Get Mcp Server Config by Name.
 * @param config - Mcp Server Config.
 * @param name - Mcp Server Config Name.
 */
export function GetMcpServerConfig(config: McpServerConfig, name: string): McpServerConfig {
  const output: McpServerConfig = { mcpServers: {} };
  output.mcpServers[name] = config.mcpServers[name];
  return output;
}
