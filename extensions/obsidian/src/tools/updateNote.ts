import { Tool } from "@raycast/api";
import fs from "fs";
import { applyTemplates } from "../api/templating/templating.service";
import { Obsidian } from "@/obsidian";

type Input = {
  /**
   * The FULL absolute path of the note to update.
   * IMPORTANT: Always specify the complete absolute path to the note file (e.g., /path/to/vault/folder/note.md).
   */
  fullNotePath: string;

  /**
   * The exact text/section to find and replace in the note
   */
  oldContent: string;

  /**
   * The new content to replace the old content with
   */
  newContent: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Update content in note "${input.fullNotePath}"?`,
  };
};

/**
 * Update a note by replacing a specific section of content with new content
 */
export default async function tool(input: Input) {
  try {
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

    // Read the current note content
    const currentContent = fs.readFileSync(input.fullNotePath, "utf8");

    // Apply templates to new content
    const processedNewContent = await applyTemplates(input.newContent);

    // Check if the old content exists in the note
    if (!currentContent.includes(input.oldContent)) {
      return `Failed to update note: Could not find the specified content to replace in "${input.fullNotePath}". Make sure the oldContent exactly matches the text in the note.`;
    }

    // Replace the old content with the new content
    const updatedContent = currentContent.replace(input.oldContent, processedNewContent);

    // Write the updated content back to the file
    fs.writeFileSync(input.fullNotePath, updatedContent, "utf8");

    return `Successfully updated note "${input.fullNotePath}"`;
  } catch (error) {
    return `Failed to update note "${input.fullNotePath}": ${error}`;
  }
}
