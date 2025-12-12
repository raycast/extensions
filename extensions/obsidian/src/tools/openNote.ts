import { open } from "@raycast/api";
import { Obsidian, ObsidianTargetType } from "@/obsidian";

type Input = {
  /**
   * The FULL absolute path of the note to open in Obsidian.
   * IMPORTANT: Always specify the complete absolute path to the note file (e.g., /path/to/vault/folder/note.md).
   */
  fullNotePath: string;

  /**
   * Specify whether the note should be opened in a new pane in Obsidian
   */
  openInNewPane?: boolean;
};

/**
 * Open a note in Obsidian
 */
export default async function tool(input: Input) {
  // Validate that the path contains a valid vault name
  const allVaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();
  const pathContainsVault = allVaults.some((vault) => input.fullNotePath.includes(vault.name));

  if (!pathContainsVault) {
    const vaultNames = allVaults.map((v) => v.name).join(", ");
    return `Invalid path: The fullNotePath "${
      input.fullNotePath
    }" does not appear to contain a valid vault name. Please use the FULL ABSOLUTE path to the note file (e.g., /path/to/vault/${
      allVaults[0]?.name || "VaultName"
    }/folder/note.md). Available vaults: ${vaultNames}`;
  }

  const target = Obsidian.getTarget({
    type: ObsidianTargetType.OpenPath,
    path: input.fullNotePath,
  });

  await open(target);

  return `Opened note "${input.fullNotePath}" in Obsidian.`;
}
