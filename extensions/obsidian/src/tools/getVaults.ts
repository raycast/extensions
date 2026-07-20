import { Obsidian } from "@/obsidian";

/**
 * Get a list of all available Obsidian vaults with their names and paths
 */
export default async function tool() {
  const vaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();

  if (vaults.length === 0) {
    return "No vaults found. Please configure vault paths in Raycast preferences.";
  }

  let result = `Found ${vaults.length} vault(s):\n\n`;

  vaults.forEach((vault, index) => {
    result += `${index + 1}. **${vault.name}**\n`;
    result += `   - Path: ${vault.path}\n\n`;
  });

  return result;
}
