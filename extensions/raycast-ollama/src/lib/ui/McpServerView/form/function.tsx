import { McpServerConfig } from "../../../mcp/types";

/**
 * Get Initial Value for Config on Form.
 * @param config - Mcp Server Config.
 * @param configName - Mcp Server Config Name.
 */
export function GetInitialValueConfig(config: McpServerConfig, configName?: string): string {
  if (!configName || !config.mcpServers[configName]) return "";

  const output: McpServerConfig = { mcpServers: {} };
  output.mcpServers[configName] = config.mcpServers[configName];

  return JSON.stringify(output, null, 2);
}
