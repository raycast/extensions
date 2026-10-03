import { listVaults } from "../lib/baalda";

/**
 * List the Baalda vaults accessible with the configured MCP token.
 * Call this first to get a vaultId for the other Baalda tools.
 */
export default async function tool(): Promise<string> {
  const vaults = await listVaults();
  if (!Array.isArray(vaults) || vaults.length === 0) return "No vaults accessible with this MCP token.";
  return JSON.stringify(vaults, null, 2);
}
