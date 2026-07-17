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
  // Validate that the path is within a configured vault
  const allVaults = await Obsidian.getVaultsFromPreferencesOrObsidianJson();
  const isValidPath = Obsidian.validateNotePath(input.fullNotePath, allVaults);

  if (!isValidPath) {
    const vaultInfo = allVaults.map((v) => `${v.name} (${v.path})`).join(", ");
    return `Invalid path: The fullNotePath "${
      input.fullNotePath
    }" is not within any configured vault. Please use the FULL ABSOLUTE path to the note file (e.g., ${
      allVaults[0]?.path || "/path/to/vault"
    }/folder/note.md). Available vaults: ${vaultInfo}`;
  }

  const target = Obsidian.getTarget({
    type: ObsidianTargetType.OpenPath,
    path: input.fullNotePath,
  });

  await open(target);

  return `Opened note "${input.fullNotePath}" in Obsidian.`;
}
